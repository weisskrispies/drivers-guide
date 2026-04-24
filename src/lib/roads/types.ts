export type Difficulty = "easy" | "moderate" | "spirited" | "expert";
export type SurfaceQuality = "excellent" | "good" | "fair" | "poor" | "mixed";

export type LngLat = [number, number];

export type Road = {
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
  characteristics: string[];
  hazards: string[];
  best_time: string | null;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  path: LngLat[];
};
