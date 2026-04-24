#!/usr/bin/env node
/**
 * Upgrade the hand-crafted waypoint paths in src/lib/roads/data.ts to real
 * road geometry fetched from the public OSRM router.
 *
 *   npm run fetch-routes
 *
 * For each road, sends the existing path's waypoints to OSRM as a driving
 * route request, then replaces the `path: [...]` array in data.ts with the
 * returned polyline (simplified to ~300 points max).
 *
 * Requires network access. Run locally, or wire into CI; the sandbox that
 * Claude runs in does not have OSRM whitelisted, so this has to be run
 * outside Claude.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(HERE, "..", "src", "lib", "roads", "data.ts");
const OSRM = "https://router.project-osrm.org/route/v1/driving";

function coordPair(c) {
  return `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
}

async function fetchRoute(waypoints) {
  // OSRM accepts up to ~100 waypoints; we send 4–8 so the response hugs the
  // road rather than taking shortcuts.
  const coords = waypoints.map(coordPair).join(";");
  const url = `${OSRM}/${coords}?overview=full&geometries=geojson&steps=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM ${res.status} for ${coords}`);
  const body = await res.json();
  const coordinates = body.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coordinates)) throw new Error("no geometry in response");
  return coordinates;
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

  // Parse the existing path arrays by slug without eval — simple regex pass
  // that matches the current formatting convention in data.ts.
  const roadRegex =
    /slug:\s*"([^"]+)"[\s\S]*?path:\s*\[([\s\S]*?)\],/g;

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
    entries.push({ slug, waypoints, matchStart: m.index + m[0].length });
  }

  console.log(`found ${entries.length} roads`);

  let updated = source;
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
        continue;
      }
      updated = updated.replace(slugRegex, `$1${newPath}$2`);
      console.log(`${simplified.length} pts`);
      // be kind to the demo server
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
    }
  }

  await writeFile(DATA_PATH, updated, "utf8");
  console.log("\nwrote", DATA_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
