#!/usr/bin/env node
/**
 * Upgrade the hand-crafted waypoint paths in src/lib/roads/data.ts to real
 * road geometry fetched from the public OSRM router.
 *
 *   npm run fetch-routes
 *
 * For each road, sends the existing path's waypoints to OSRM as a driving
 * route request, then replaces the `path: [...]` array in data.ts with
 * the returned polyline (simplified to ~300 points max).
 *
 * Designed to also run in CI (GitHub Pages workflow): retries transient
 * failures, swallows per-road errors so the build never fails just
 * because OSRM is rate-limiting us, and leaves the existing path in
 * place if a refresh isn't possible.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(HERE, "..", "src", "lib", "roads", "data.ts");
const OSRM = process.env.OSRM_URL ?? "https://router.project-osrm.org/route/v1/driving";
const RATE_LIMIT_MS = Number(process.env.OSRM_DELAY_MS ?? 700);
const MAX_ATTEMPTS = 3;

function coordPair(c) {
  return `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRoute(waypoints) {
  const coords = waypoints.map(coordPair).join(";");
  const url = `${OSRM}/${coords}?overview=full&geometries=geojson&steps=false`;
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "drivers-guide/1.0" } });
      if (res.status === 429 || res.status >= 500) {
        // rate-limit / transient — back off and retry
        await sleep(1500 * attempt);
        lastErr = new Error(`OSRM ${res.status}`);
        continue;
      }
      if (!res.ok) throw new Error(`OSRM ${res.status}`);
      const body = await res.json();
      const coordinates = body.routes?.[0]?.geometry?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        throw new Error("no geometry");
      }
      return coordinates;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) await sleep(800 * attempt);
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
  const source = await readFile(DATA_PATH, "utf8");

  // Parse the existing path arrays by slug — simple regex over the
  // current formatting convention in data.ts.
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

  console.log(`found ${entries.length} roads`);

  let updated = source;
  let success = 0;
  let failed = 0;
  for (const { slug, waypoints } of entries) {
    process.stdout.write(`• ${slug} … `);
    try {
      const coords = await fetchRoute(waypoints);
      const simplified = simplify(coords);
      const newPath = formatPath(simplified);
      const slugRegex = new RegExp(
        `(slug:\\s*"${slug}"[\\s\\S]*?path:\\s*)\\[[\\s\\S]*?\\](,)`,
      );
      if (!slugRegex.test(updated)) {
        console.log("SKIP (could not locate path block)");
        failed++;
        continue;
      }
      updated = updated.replace(slugRegex, `$1${newPath}$2`);
      console.log(`${simplified.length} pts`);
      success++;
      await sleep(RATE_LIMIT_MS);
    } catch (err) {
      console.log(`FAIL: ${err.message ?? err}`);
      failed++;
    }
  }

  await writeFile(DATA_PATH, updated, "utf8");
  console.log(
    `\nwrote ${DATA_PATH}\n${success} updated, ${failed} kept their hand-crafted approximation`,
  );
}

main().catch((err) => {
  // Don't fail the CI build just because OSRM is having a bad day —
  // the existing approximations stay in place and we ship them.
  console.error("[fetch-routes] non-fatal:", err?.message ?? err);
  process.exit(0);
});
