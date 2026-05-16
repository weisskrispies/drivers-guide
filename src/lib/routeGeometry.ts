// Real road-following geometry for a planned drive.
//
// Runs in the browser (which has internet) at "Plan my drive" time and
// asks a public OSRM router for the actual driving polyline through the
// ordered waypoints, plus where each input point snapped onto the road
// network (so pins sit exactly on the drawn route). Keyless, no setup.
// ANY failure returns null and the caller falls back to pins-only — it
// can never draw a wrong line.

export type LngLat = [number, number];

export interface RouteGeometry {
  /** Full road-following polyline. */
  line: LngLat[];
  /** Each input point snapped onto the road network, in input order.
   *  Empty if OSRM didn't return waypoints. */
  snapped: LngLat[];
}

const OSRM = "https://router.project-osrm.org/route/v1/driving/";

interface OsrmResponse {
  code?: string;
  routes?: { geometry?: { coordinates?: [number, number][] } }[];
  waypoints?: { location?: [number, number] }[];
}

function validCoord(c: unknown): c is [number, number] {
  return (
    Array.isArray(c) &&
    c.length >= 2 &&
    typeof c[0] === "number" &&
    typeof c[1] === "number"
  );
}

/** Pure parser, separated so it can be unit-tested without a network. */
export function parseOsrmGeometry(json: unknown): RouteGeometry | null {
  const r = json as OsrmResponse;
  if (r?.code && r.code !== "Ok") return null;
  const coords = r?.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  for (const c of coords) if (!validCoord(c)) return null;

  const snapped: LngLat[] = [];
  if (Array.isArray(r.waypoints)) {
    for (const w of r.waypoints) {
      if (validCoord(w?.location)) {
        snapped.push([w.location[0], w.location[1]]);
      } else {
        // Misaligned waypoints would mis-place pins — drop them all and
        // let the caller fall back to curated coordinates.
        snapped.length = 0;
        break;
      }
    }
  }

  return {
    line: coords.map(([lng, lat]) => [lng, lat]),
    snapped,
  };
}

/**
 * Fetch the true driving polyline (and snapped waypoint locations)
 * through `points` in order. Returns null on any problem so callers
 * degrade to pins-only rather than ever drawing inaccurate geometry.
 */
export async function fetchRouteGeometry(
  points: { lat: number; lng: number }[],
): Promise<RouteGeometry | null> {
  if (points.length < 2) return null;
  if (points.length > 25) return null;

  const coordStr = points
    .map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`)
    .join(";");
  const url = `${OSRM}${coordStr}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const json = await res.json();
    return parseOsrmGeometry(json);
  } catch {
    return null;
  }
}
