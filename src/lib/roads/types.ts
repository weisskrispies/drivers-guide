export type Difficulty = "easy" | "moderate" | "spirited" | "expert";
export type SurfaceQuality = "excellent" | "good" | "fair" | "poor" | "mixed";

export type RoadSource = {
  label: string;
  url: string;
};

export type Road = {
  slug: string;
  name: string;
  region: string;
  summary: string;
  description: string;
  distanceMiles: number;
  elevationGainFt: number;
  estDriveMinutes: number;
  difficulty: Difficulty;
  surfaceQuality: SurfaceQuality;
  trafficNotes: string;
  characteristics: string[];
  hazards: string[];
  bestTime: string;
  start: { lat: number; lng: number; label: string };
  end: { lat: number; lng: number; label: string };
  sources: RoadSource[];
};

export type LatLng = { lat: number; lng: number };
