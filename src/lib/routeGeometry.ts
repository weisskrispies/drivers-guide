// Real road-following geometry for a planned drive.
//
// Runs in the browser (which has internet) at "Plan my drive" time and
// asks a public OSRM router for the actual driving polyline through the
// ordered waypoints. Keyless, no setup. ANY failure returns null and the
// caller falls back to pins-only — it can never draw a wrong line.

export type LngLat = [number, number];

const OSRM = "https://router.project-osrm.org/route/v1/driving/";

interface OsrmResponse {
  code?: string;
  routes?: { geometry?: { coordinates?: [number, number][] } }[];
}

/** Pure parser, separated so it can be unit-tested without a network. */
export function parseOsrmGeometry(json: unknown): LngLat[] | null {
  const r = json as OsrmResponse;
  if (r?.code && r.code !== "Ok") return null;
  const coords = r?.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  // Validate shape: every item is [number, number].
  for (const c of coords) {
    if (
      !Array.isArray(c) ||
      c.length < 2 ||
      typeof c[0] !== "number" ||
      typeof c[1] !== "number"
    ) {
      return null;
    }
  }
  return coords.map(([lng, lat]) => [lng, lat]);
}

/**
 * Fetch the true driving polyline through `points` (in order). Returns
 * null on any problem (offline, rate-limited, bad response) so callers
 * degrade to pins-only rather than ever drawing inaccurate geometry.
 */
export async function fetchRouteGeometry(
  points: { lat: number; lng: number }[],
): Promise<LngLat[] | null> {
  if (points.length < 2) return null;
  // OSRM's public demo is happiest with a modest number of coordinates.
  // Our planned routes are well under, but guard anyway.
  if (points.length > 25) return null;

  const coordStr = points
    .map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`)
    .join(";");
  const url = `${OSRM}${coordStr}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return parseOsrmGeometry(json);
  } catch {
    return null;
  }
}
