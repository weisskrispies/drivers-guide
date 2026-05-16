import type { LatLng } from "./roads/types";

const EARTH_RADIUS_MI = 3958.8;

export function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h));
}

export function formatMiles(miles: number): string {
  if (!Number.isFinite(miles)) return "—";
  if (miles < 10) return miles.toFixed(1) + " mi";
  return Math.round(miles) + " mi";
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** [lng, lat] — GeoJSON/MapLibre order, matches Road.path. */
export type Coord = [number, number];

const DEG = Math.PI / 180;

export function coordToLatLng(c: Coord): LatLng {
  return { lng: c[0], lat: c[1] };
}

export function latLngToCoord(p: LatLng): Coord {
  return [p.lng, p.lat];
}

/** Initial compass bearing (0–360°, 0 = north) from a to b. */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const lat1 = a.lat * DEG;
  const lat2 = b.lat * DEG;
  const dLng = (b.lng - a.lng) * DEG;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) / DEG + 360) % 360;
}

/** Smallest absolute difference between two compass bearings (0–180). */
export function bearingDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Summed length of a [lng,lat] polyline in miles. */
export function pathLengthMiles(path: Coord[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversineMiles(coordToLatLng(path[i - 1]), coordToLatLng(path[i]));
  }
  return total;
}

/** Length-weighted average bearing across a [lng,lat] polyline. */
export function pathAverageBearing(path: Coord[]): number {
  let sx = 0;
  let sy = 0;
  for (let i = 1; i < path.length; i++) {
    const a = coordToLatLng(path[i - 1]);
    const b = coordToLatLng(path[i]);
    const w = haversineMiles(a, b);
    const br = bearingDegrees(a, b) * DEG;
    sx += Math.cos(br) * w;
    sy += Math.sin(br) * w;
  }
  if (sx === 0 && sy === 0) return 0;
  return (Math.atan2(sy, sx) / DEG + 360) % 360;
}
