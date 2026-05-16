import {
  analyzeDateTime,
  describeDateTime,
  glareNoteForBearing,
} from "@/lib/daytime";
import {
  type Coord,
  coordToLatLng,
  haversineMiles,
  pathAverageBearing,
  pathLengthMiles,
} from "@/lib/geo";
import type { Difficulty, LatLng, Road, SurfaceQuality } from "@/lib/roads/types";

// Connector roads are estimated with straight lines: this is a static
// site with no routing backend, and the curated road `path` geometry is
// already accurate. Connectors are clearly labelled as estimates.
const CONNECTOR_AVG_MPH = 28;
const MAX_ROADS = 10;

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  easy: 0,
  moderate: 1,
  spirited: 2,
  expert: 3,
};
const SPEED_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 35,
  moderate: 30,
  spirited: 26,
  expert: 20,
};
const FUN_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 1,
  moderate: 2.2,
  spirited: 4,
  expert: 3.6,
};
const SURFACE_BONUS: Record<SurfaceQuality, number> = {
  excellent: 1.5,
  good: 1,
  fair: 0.3,
  mixed: 0.2,
  poor: 0,
};
const POSITIVE_TRAITS = [
  "curves",
  "sweeper",
  "twisty",
  "technical",
  "switchback",
  "scenic",
  "views",
  "coastal",
  "redwood",
  "ridgeline",
  "ocean",
];

export type PlannerStart = LatLng & { label?: string };

export interface PlannerInput {
  start: PlannerStart;
  target:
    | { kind: "duration"; minutes: number }
    | { kind: "distance"; miles: number };
  /** Wall-clock ISO local datetime, e.g. "2026-05-16T09:00". */
  dateTime: string;
  stops?: PlannerStart[];
  loop?: boolean;
  maxDifficulty?: Difficulty;
}

export type SegmentKind = "road" | "connector" | "stop";

export interface PlanSegment {
  kind: SegmentKind;
  label: string;
  roadSlug?: string;
  distanceMiles: number;
  durationMinutes: number;
  path: Coord[];
  difficulty?: Difficulty;
  surfaceQuality?: SurfaceQuality;
  hazards?: string[];
  characteristics?: string[];
  notes?: string[];
}

export interface DrivePlan {
  start: PlannerStart;
  loop: boolean;
  segments: PlanSegment[];
  totalDistanceMiles: number;
  totalDurationMinutes: number;
  notes: string[];
}

function roadDistanceMiles(road: Road): number {
  return road.distanceMiles || pathLengthMiles(road.path);
}

function roadDurationMinutes(road: Road): number {
  if (road.estDriveMinutes) return road.estDriveMinutes;
  return (roadDistanceMiles(road) / SPEED_BY_DIFFICULTY[road.difficulty]) * 60;
}

function enjoymentScore(road: Road): number {
  let score = FUN_BY_DIFFICULTY[road.difficulty];
  score += SURFACE_BONUS[road.surfaceQuality] ?? 0.5;
  const traits = `${road.characteristics.join(" ")} ${road.summary}`.toLowerCase();
  for (const t of POSITIVE_TRAITS) if (traits.includes(t)) score += 0.4;
  return score;
}

interface Oriented {
  road: Road;
  entry: LatLng;
  exit: LatLng;
  path: Coord[];
}

function orient(road: Road, from: LatLng): Oriented {
  const start = coordToLatLng(road.path[0]);
  const end = coordToLatLng(road.path[road.path.length - 1]);
  const reversed = haversineMiles(from, end) < haversineMiles(from, start);
  return {
    road,
    entry: reversed ? end : start,
    exit: reversed ? start : end,
    path: reversed ? [...road.path].reverse() : road.path,
  };
}

function straightConnector(
  from: LatLng,
  to: LatLng,
  label: string,
  kind: "connector" | "stop",
): PlanSegment | null {
  const miles = haversineMiles(from, to);
  if (miles < 0.05) return null;
  return {
    kind,
    label,
    distanceMiles: Number(miles.toFixed(2)),
    durationMinutes: Math.round((miles / CONNECTOR_AVG_MPH) * 60),
    path: [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ],
  };
}

function bestTimeMismatch(
  road: Road,
  ctx: ReturnType<typeof analyzeDateTime>,
): string | null {
  if (!road.bestTime || !ctx.valid) return null;
  const bt = road.bestTime.toLowerCase();
  if ((bt.includes("morning") || bt.includes("sunrise")) && ctx.decimalHour >= 12) {
    return `${road.name}: best in the morning (recommended: ${road.bestTime}).`;
  }
  if (bt.includes("weekday") && ctx.isWeekend) {
    return `${road.name}: quieter on weekdays (recommended: ${road.bestTime}).`;
  }
  return null;
}

function weekendPopular(
  road: Road,
  ctx: ReturnType<typeof analyzeDateTime>,
): string | null {
  if (!ctx.isWeekend) return null;
  const blob =
    `${road.characteristics.join(" ")} ${road.hazards.join(" ")} ${road.trafficNotes}`.toLowerCase();
  if (
    blob.includes("cyclist") ||
    blob.includes("motorcycle") ||
    blob.includes("tourist") ||
    blob.includes("popular")
  ) {
    return `${road.name}: busy on weekends — cyclists/traffic, go early.`;
  }
  return null;
}

export function planDrive(roads: Road[], input: PlannerInput): DrivePlan {
  const ctx = analyzeDateTime(input.dateTime);
  const loop = input.loop !== false;
  const maxRank =
    input.maxDifficulty != null
      ? DIFFICULTY_RANK[input.maxDifficulty]
      : DIFFICULTY_RANK.expert;

  const targetIsDuration = input.target.kind === "duration";
  const targetValue =
    input.target.kind === "duration"
      ? input.target.minutes
      : input.target.miles;

  const candidates = roads.filter(
    (r) => DIFFICULTY_RANK[r.difficulty] <= maxRank,
  );

  const segments: PlanSegment[] = [];
  const planNotes: string[] = [];
  const visited = new Set<string>();
  let current: LatLng = input.start;
  let totalMi = 0;
  let totalMin = 0;

  const progress = () => (targetIsDuration ? totalMin : totalMi);
  const reached = () => progress() >= targetValue * 0.95;

  while (segments.filter((s) => s.kind === "road").length < MAX_ROADS) {
    if (reached()) break;

    let best: { o: Oriented; value: number } | null = null;
    for (const road of candidates) {
      if (visited.has(road.slug)) continue;
      const o = orient(road, current);
      const connectorMi = haversineMiles(current, o.entry);
      const roadMi = roadDistanceMiles(road);
      const addend = targetIsDuration ? roadDurationMinutes(road) : roadMi;
      if (
        segments.some((s) => s.kind === "road") &&
        progress() + addend > targetValue * 1.4
      ) {
        continue;
      }
      const value =
        enjoymentScore(road) / (1 + connectorMi * 0.6) -
        (connectorMi > roadMi ? 0.5 : 0);
      if (!best || value > best.value) best = { o, value };
    }

    if (!best) break;
    const { o } = best;

    const connector = straightConnector(
      current,
      o.entry,
      `Drive to ${o.road.name}`,
      "connector",
    );
    if (connector) {
      segments.push(connector);
      totalMi += connector.distanceMiles;
      totalMin += connector.durationMinutes;
    }

    const roadMi = roadDistanceMiles(o.road);
    const roadMin = roadDurationMinutes(o.road);
    const segNotes: string[] = [];
    const glare = glareNoteForBearing(pathAverageBearing(o.path), ctx);
    if (glare) segNotes.push(glare);

    segments.push({
      kind: "road",
      label: o.road.name,
      roadSlug: o.road.slug,
      distanceMiles: Number(roadMi.toFixed(2)),
      durationMinutes: Math.round(roadMin),
      path: o.path,
      difficulty: o.road.difficulty,
      surfaceQuality: o.road.surfaceQuality,
      hazards: o.road.hazards,
      characteristics: o.road.characteristics,
      notes: segNotes.length ? segNotes : undefined,
    });
    visited.add(o.road.slug);
    totalMi += roadMi;
    totalMin += roadMin;
    current = o.exit;

    const bt = bestTimeMismatch(o.road, ctx);
    if (bt && !planNotes.includes(bt)) planNotes.push(bt);
    const wk = weekendPopular(o.road, ctx);
    if (wk && !planNotes.includes(wk)) planNotes.push(wk);
  }

  for (const stop of input.stops ?? []) {
    const seg = straightConnector(
      current,
      stop,
      `Stop: ${stop.label ?? "waypoint"}`,
      "stop",
    );
    if (seg) {
      segments.push(seg);
      totalMi += seg.distanceMiles;
      totalMin += seg.durationMinutes;
    }
    current = stop;
  }

  if (loop && haversineMiles(current, input.start) >= 0.05) {
    const back = straightConnector(
      current,
      input.start,
      "Return to start",
      "connector",
    );
    if (back) {
      segments.push(back);
      totalMi += back.distanceMiles;
      totalMin += back.durationMinutes;
    }
  }

  if (segments.filter((s) => s.kind === "road").length === 0) {
    planNotes.push(
      "No curated roads matched within range — try a longer target, a higher difficulty cap, or a different start.",
    );
  }
  if (ctx.valid) planNotes.unshift(`Planned for ${describeDateTime(ctx)}.`);
  if (ctx.isRushHour && segments.some((s) => s.kind === "connector")) {
    planNotes.push(
      "Weekday commute hours — transit legs near town may be congested.",
    );
  }
  if (segments.some((s) => s.kind === "connector" || s.kind === "stop")) {
    planNotes.push(
      "Connector legs are straight-line estimates; the curated roads themselves use accurate geometry.",
    );
  }

  return {
    start: input.start,
    loop,
    segments,
    totalDistanceMiles: Number(totalMi.toFixed(1)),
    totalDurationMinutes: Math.round(totalMin),
    notes: planNotes,
  };
}
