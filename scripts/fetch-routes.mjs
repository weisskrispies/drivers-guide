#!/usr/bin/env node
/**
 * Upgrade the hand-crafted waypoint paths in src/lib/roads/data.ts to real
 * road geometry fetched from a public OSRM router.
 *
 *   npm run fetch-routes
 *
 * Strategy:
 *  1. For each road, try the primary OSRM endpoint.
 *  2. If that fails (rate limit, no route, no geometry), fall back to a
 *     mirror endpoint.
 *  3. If both fail with the full waypoint list, retry with just the
 *     start + every 4th waypoint + end — sometimes OSRM rejects when one
 *     of many waypoints can't be snapped to a road.
 *  4. As a final fallback, fetch start→end only and let OSRM choose the
 *     route.
 *  5. If everything fails, leave the existing path in place (the script
 *     never fails the build because of OSRM).
 *
 * Verbose logging so CI logs show exactly which road took which path.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(HERE, "..", "src", "lib", "roads", "data.ts");

const ENDPOINTS = (
  process.env.OSRM_URLS ??
  [
    "https://router.project-osrm.org/route/v1/driving",
    "https://routing.openstreetmap.de/routed-car/route/v1/driving",
  ].join(",")
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const RATE_LIMIT_MS = Number(process.env.OSRM_DELAY_MS ?? 700);
const MAX_ATTEMPTS = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function coordPair(c) {
  return `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
}

async function tryFetch(endpoint, waypoints) {
  const coords = waypoints.map(coordPair).join(";");
  const url = `${endpoint}/${coords}?overview=full&geometries=geojson&steps=false`;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": "drivers-guide/1.0" },
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(1500 * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const coordinates = body.routes?.[0]?.geometry?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        throw new Error("no geometry");
      }
      return coordinates;
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) await sleep(800 * attempt);
      else throw err;
    }
  }
  throw new Error("retries exhausted");
}

/** Reduce a waypoint list to start + sparse middle + end. */
function downsample(waypoints, keepEvery = 4) {
  if (waypoints.length <= 4) return waypoints;
  const out = [waypoints[0]];
  for (let i = 1; i < waypoints.length - 1; i += keepEvery) out.push(waypoints[i]);
  out.push(waypoints[waypoints.length - 1]);
  return out;
}

async function fetchRoute(waypoints) {
  const attempts = [
    { label: "full", points: waypoints, endpoint: ENDPOINTS[0] },
    ...(ENDPOINTS[1]
      ? [{ label: "full/mirror", points: waypoints, endpoint: ENDPOINTS[1] }]
      : []),
    {
      label: "downsampled",
      points: downsample(waypoints, 4),
      endpoint: ENDPOINTS[0],
    },
    {
      label: "endpoints-only",
      points: [waypoints[0], waypoints[waypoints.length - 1]],
      endpoint: ENDPOINTS[0],
    },
  ];

  let lastErr;
  for (const { label, points, endpoint } of attempts) {
    try {
      const coords = await tryFetch(endpoint, points);
      return { coords, strategy: label };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("unknown OSRM failure");
}

function simplify(coords, maxPoints = 300) {
  if (coords.length <= maxPoints) return coords;
  const stride = Math.ceil(coords.length / maxPoints);
  const out = coords.filter((_, i) => i % stride === 0);
  if (out[out.length - 1] !== coords[coords.length - 1]) {
    out.push(coords[coords.length - 1]);
  }
  return out;
}

function formatPath(coords) {
  const inner = coords
    .map((c) => `      [${c[0].toFixed(5)}, ${c[1].toFixed(5)}]`)
    .join(",\n");
  return `[\n${inner},\n    ]`;
}

async function main() {
  console.log(`[fetch-routes] endpoints: ${ENDPOINTS.join(", ")}`);
  const source = await readFile(DATA_PATH, "utf8");

  const roadRegex = /slug:\s*"([^"]+)"[\s\S]*?path:\s*\[([\s\S]*?)\],/g;
  const entries = [];
  let m;
  while ((m = roadRegex.exec(source)) !== null) {
    const slug = m[1];
    const pathBlock = m[2];
    const waypoints = [
      ...pathBlock.matchAll(
        /\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g,
      ),
    ].map((mm) => [Number(mm[1]), Number(mm[2])]);
    entries.push({ slug, waypoints });
  }

  console.log(`[fetch-routes] found ${entries.length} roads`);

  let updated = source;
  let success = 0;
  let failed = 0;
  const failures = [];

  for (const { slug, waypoints } of entries) {
    process.stdout.write(`• ${slug.padEnd(34)} `);
    try {
      const { coords, strategy } = await fetchRoute(waypoints);
      const simplified = simplify(coords);
      const newPath = formatPath(simplified);
      const slugRegex = new RegExp(
        `(slug:\\s*"${slug}"[\\s\\S]*?path:\\s*)\\[[\\s\\S]*?\\](,)`,
      );
      if (!slugRegex.test(updated)) {
        console.log(`SKIP (path block not found)`);
        failed++;
        failures.push({ slug, reason: "path block not found" });
        continue;
      }
      updated = updated.replace(slugRegex, `$1${newPath}$2`);
      console.log(`✓ ${simplified.length} pts via ${strategy}`);
      success++;
      await sleep(RATE_LIMIT_MS);
    } catch (err) {
      console.log(`✗ ${err?.message ?? err}`);
      failed++;
      failures.push({ slug, reason: err?.message ?? String(err) });
    }
  }

  await writeFile(DATA_PATH, updated, "utf8");
  console.log(
    `\n[fetch-routes] wrote ${DATA_PATH}\n` +
      `  ${success} updated, ${failed} kept hand-crafted approximation`,
  );
  if (failures.length) {
    console.log("\n[fetch-routes] failures:");
    for (const { slug, reason } of failures) {
      console.log(`  - ${slug}: ${reason}`);
    }
  }
}

main().catch((err) => {
  // Don't fail the CI build just because OSRM is having a bad day —
  // the existing approximations stay in place and we ship them.
  console.error("[fetch-routes] non-fatal:", err?.message ?? err);
  process.exit(0);
});
