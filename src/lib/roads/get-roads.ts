import "server-only";
import { createClient } from "@supabase/supabase-js";
import { seedRoads } from "./seed";
import type { Road, Difficulty, SurfaceQuality, LngLat } from "./types";

type RoadRow = {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  summary: string | null;
  description: string | null;
  distance_miles: number | null;
  elevation_gain_ft: number | null;
  est_drive_minutes: number | null;
  difficulty: Difficulty | null;
  surface_quality: SurfaceQuality | null;
  traffic_notes: string | null;
  characteristics: string[] | null;
  hazards: string[] | null;
  best_time: string | null;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  path: LngLat[];
};

function rowToRoad(row: RoadRow): Road {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    region: row.region,
    summary: row.summary,
    description: row.description,
    distance_miles: row.distance_miles,
    elevation_gain_ft: row.elevation_gain_ft,
    est_drive_minutes: row.est_drive_minutes,
    difficulty: row.difficulty,
    surface_quality: row.surface_quality,
    traffic_notes: row.traffic_notes,
    characteristics: row.characteristics ?? [],
    hazards: row.hazards ?? [],
    best_time: row.best_time,
    start_lat: row.start_lat,
    start_lng: row.start_lng,
    end_lat: row.end_lat,
    end_lng: row.end_lng,
    path: row.path,
  };
}

export async function getRoads(): Promise<Road[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return seedRoads;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("roads")
    .select(
      "id, slug, name, region, summary, description, distance_miles, elevation_gain_ft, est_drive_minutes, difficulty, surface_quality, traffic_notes, characteristics, hazards, best_time, start_lat, start_lng, end_lat, end_lng, path",
    )
    .eq("is_published", true)
    .order("name");

  if (error || !data || data.length === 0) {
    return seedRoads;
  }

  return (data as RoadRow[]).map(rowToRoad);
}
