"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { formatMiles, formatMinutes } from "@/lib/geo";
import {
  planDrive,
  type DrivePlan,
  type PlannerStart,
} from "@/lib/planner";
import type { Difficulty, LatLng, Road } from "@/lib/roads/types";
import type { HomeLocation, Theme } from "@/lib/storage";

const PlannerMap = dynamic(() => import("./PlannerMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[var(--surface)] text-sm text-[var(--text-muted)]">
      Loading map…
    </div>
  ),
});

const DIFFICULTIES: Difficulty[] = ["easy", "moderate", "spirited", "expert"];

type Point = { lat: number; lng: number; label?: string };

type Props = {
  roads: Road[];
  home: HomeLocation | null;
  currentLocation: LatLng | null;
  onRequestGeo: () => void;
  theme: Theme;
};

function nextSaturday9am(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T09:00`;
}

/** Ordered route points: start, each road's entry+exit (so Maps routes
 *  along the road, not just to it), stops, then back to start on a loop. */
function routePoints(plan: DrivePlan): Point[] {
  const pts: Point[] = [
    { ...plan.start, label: plan.start.label ?? "Start" },
  ];
  for (const s of plan.segments) {
    if (s.kind === "road" && s.path.length >= 2) {
      const a = s.path[0];
      const b = s.path[s.path.length - 1];
      pts.push({ lng: a[0], lat: a[1], label: `${s.label} (start)` });
      pts.push({ lng: b[0], lat: b[1], label: `${s.label} (end)` });
    } else if (s.kind === "stop" && s.path.length >= 1) {
      const c = s.path[s.path.length - 1];
      pts.push({ lng: c[0], lat: c[1], label: s.label });
    }
  }
  if (plan.loop) pts.push({ ...plan.start, label: "Back to start" });
  return pts;
}

const fmt = (p: Point) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

/** Google Maps web tops out around 10 locations per directions URL, so
 *  split long routes into consecutive legs (sharing the boundary point)
 *  rather than silently dropping waypoints. */
function googleLegs(points: Point[]): string[] {
  const MAX = 10;
  if (points.length <= MAX) {
    return [
      `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${fmt(
        points[0],
      )}&destination=${fmt(points[points.length - 1])}` +
        (points.length > 2
          ? `&waypoints=${points
              .slice(1, -1)
              .map(fmt)
              .map(encodeURIComponent)
              .join("|")}`
          : ""),
    ];
  }
  const legs: string[] = [];
  for (let i = 0; i < points.length - 1; i += MAX - 1) {
    const slice = points.slice(i, i + MAX);
    legs.push(
      `https://www.google.com/maps/dir/${slice.map(fmt).join("/")}/?travelmode=driving`,
    );
  }
  return legs;
}

function appleLink(points: Point[]): string {
  // Apple Maps chains destinations with "+to:".
  const daddr = points
    .slice(1)
    .map(fmt)
    .join("+to:");
  return `https://maps.apple.com/?saddr=${fmt(points[0])}&daddr=${daddr}&dirflg=d`;
}

export default function DrivePlanner({
  roads,
  home,
  currentLocation,
  onRequestGeo,
  theme,
}: Props) {
  // Start is exactly one of: GPS, your saved Home, or a specific point
  // (typed lat,lng or tapped on the map). No competing presets.
  const [startMode, setStartMode] = useState<"gps" | "home" | "custom">(
    "home",
  );
  const [customPoint, setCustomPoint] = useState<PlannerStart | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [addingStops, setAddingStops] = useState(false);
  const [stops, setStops] = useState<PlannerStart[]>([]);

  const start: PlannerStart | null =
    startMode === "gps"
      ? currentLocation
        ? { ...currentLocation, label: "My location" }
        : null
      : startMode === "home"
        ? home ?? null
        : customPoint;
  const [targetKind, setTargetKind] = useState<"duration" | "distance">(
    "duration",
  );
  const [targetValue, setTargetValue] = useState(120);
  const [dateTime, setDateTime] = useState(nextSaturday9am);
  const [maxDifficulty, setMaxDifficulty] = useState<Difficulty>("expert");
  const [loop, setLoop] = useState(true);
  const [plan, setPlan] = useState<DrivePlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handlePick(p: { lat: number; lng: number }) {
    if (addingStops) {
      setStops((s) => [...s, { ...p, label: `Stop ${s.length + 1}` }]);
    } else if (startMode === "custom") {
      setCustomPoint({ ...p, label: "Tapped point" });
      setCustomInput(`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`);
      setCustomError(null);
    }
    // In GPS or Home mode, a stray map tap does nothing — it won't
    // hijack your start.
  }

  function applyCustomInput() {
    const parts = customInput
      .split(/[,\s]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (
      parts.length !== 2 ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setCustomError("Enter a valid “lat, lng”.");
      return;
    }
    setCustomError(null);
    setCustomPoint({ lat, lng, label: "Custom point" });
  }

  function run() {
    if (!start) {
      setError("Choose a start point.");
      return;
    }
    const bad =
      targetKind === "duration"
        ? targetValue < 15 || targetValue > 600
        : targetValue < 5 || targetValue > 400;
    if (bad) {
      setError(
        targetKind === "duration"
          ? "Duration must be 15–600 minutes."
          : "Distance must be 5–400 miles.",
      );
      return;
    }
    setError(null);
    setPlan(
      planDrive(roads, {
        start,
        target:
          targetKind === "duration"
            ? { kind: "duration", minutes: targetValue }
            : { kind: "distance", miles: targetValue },
        dateTime,
        stops,
        loop,
        maxDifficulty,
      }),
    );
  }

  // Map pins: one numbered marker per road, in drive order.
  const mapWaypoints = useMemo<Point[]>(() => {
    if (!plan) return [];
    return plan.segments
      .filter((s) => s.kind === "road" && s.path.length > 0)
      .map((s) => ({
        lng: s.path[0][0],
        lat: s.path[0][1],
        label: s.label,
      }));
  }, [plan]);

  const exportData = useMemo(() => {
    if (!plan) return null;
    const pts = routePoints(plan);
    return { legs: googleLegs(pts), apple: appleLink(pts), count: pts.length };
  }, [plan]);

  return (
    <div className="mx-auto flex min-h-0 w-full flex-1 flex-col md:max-w-[1600px] md:flex-row md:gap-6 md:px-4 md:py-4 lg:gap-8 lg:px-8 lg:py-6">
      <main className="relative order-2 min-h-[320px] flex-1 overflow-hidden md:order-1 md:rounded-3xl md:border md:border-[var(--border)] md:bg-[var(--surface)] md:shadow-[var(--shadow-card)]">
        <PlannerMap
          waypoints={mapWaypoints}
          start={start}
          stops={stops}
          theme={theme}
          onPick={handlePick}
        />
        {(addingStops || startMode === "custom") && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-[var(--surface)]/90 px-3 py-1 text-[11px] text-[var(--text-muted)] shadow">
            Tap the map to{" "}
            <span className="font-semibold text-[color:var(--accent)]">
              {addingStops ? "add a stop" : "set your start"}
            </span>
          </div>
        )}
      </main>

      <aside className="order-1 flex w-full shrink-0 flex-col gap-4 overflow-y-auto md:order-2 md:w-[400px] lg:w-[440px]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
            Start
          </h3>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {(
              [
                ["gps", "My location"],
                ["home", "Home"],
                ["custom", "Specific point"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setStartMode(mode);
                  if (mode === "gps" && !currentLocation) onRequestGeo();
                }}
                className={`rounded-full border px-2 py-1.5 text-xs ${
                  startMode === mode
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[color:var(--accent)]"
                    : "border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {startMode === "custom" && (
            <div className="mt-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyCustomInput();
                  }}
                  placeholder="lat, lng — or tap the map"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs text-[var(--text)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={applyCustomInput}
                  className="rounded-md bg-[color:var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[color:var(--accent-hover)]"
                >
                  Set
                </button>
              </div>
              {customError && (
                <p className="mt-1 text-[11px] text-red-500">{customError}</p>
              )}
            </div>
          )}

          <p className="mt-2 text-[11px] text-[var(--text-dim)]">
            {start
              ? `${start.label ?? "Start"} · ${start.lat.toFixed(
                  4,
                )}, ${start.lng.toFixed(4)}`
              : startMode === "gps"
                ? "Waiting for location permission…"
                : startMode === "home"
                  ? "No Home saved — set one from the profile menu, or use a specific point."
                  : "Enter a lat, lng or tap the map."}
          </p>

          <h3 className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
            How long
          </h3>
          <div className="mt-2 flex gap-2">
            <select
              value={targetKind}
              onChange={(e) =>
                setTargetKind(e.target.value as "duration" | "distance")
              }
              className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="duration">Duration (min)</option>
              <option value="distance">Distance (mi)</option>
            </select>
            <input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <h3 className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
            When
          </h3>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          />

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] text-[var(--text-muted)]">
              Max difficulty
            </span>
            <select
              value={maxDifficulty}
              onChange={(e) =>
                setMaxDifficulty(e.target.value as Difficulty)
              }
              className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <label className="mt-2 flex items-center justify-between text-[12px] text-[var(--text-muted)]">
            Loop back to start
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
              className="h-4 w-4 accent-[color:var(--accent)]"
            />
          </label>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAddingStops((v) => !v)}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                addingStops
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[color:var(--accent)]"
                  : "border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {addingStops ? "Tapping adds stops ✓" : "Add stops by map tap"}
            </button>
            {stops.length > 0 && (
              <button
                type="button"
                onClick={() => setStops([])}
                className="text-[11px] text-[var(--text-dim)] underline-offset-2 hover:text-[var(--text)] hover:underline"
              >
                Clear {stops.length} stop{stops.length === 1 ? "" : "s"}
              </button>
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-500">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={run}
            className="mt-4 w-full rounded-full bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--accent-hover)]"
          >
            Plan my drive
          </button>
        </div>

        {plan && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-[var(--text)]">
                Your drive
              </h3>
              <span className="text-xs text-[var(--text-muted)]">
                {formatMiles(plan.totalDistanceMiles)} ·{" "}
                {formatMinutes(plan.totalDurationMinutes)}
              </span>
            </div>

            {/* Export is the headline action — accurate turn-by-turn is
                handed off to Google Maps with every waypoint in order. */}
            {exportData && (
              <div className="mt-3">
                {exportData.legs.length === 1 ? (
                  <a
                    href={exportData.legs[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-full bg-[color:var(--accent)] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[color:var(--accent-hover)]"
                  >
                    Open route in Google Maps →
                  </a>
                ) : (
                  <div>
                    <p className="mb-1.5 text-[11px] text-[var(--text-muted)]">
                      Long route — opens as {exportData.legs.length}{" "}
                      consecutive legs so every waypoint is kept:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {exportData.legs.map((href, i) => (
                        <a
                          key={i}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent-hover)]"
                        >
                          Google Maps · Leg {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <a
                  href={exportData.apple}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block w-full rounded-full border border-[var(--border)] px-4 py-2 text-center text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
                >
                  Open in Apple Maps
                </a>
              </div>
            )}

            {plan.notes.length > 0 && (
              <ul className="mt-3 space-y-1 text-[11px] text-[var(--text-muted)]">
                {plan.notes.map((n, i) => (
                  <li key={i}>• {n}</li>
                ))}
              </ul>
            )}

            <ol className="mt-3 space-y-2.5">
              {plan.segments.map((s, i) => (
                <li
                  key={i}
                  className="border-l-2 pl-3"
                  style={{
                    borderColor:
                      s.kind === "road"
                        ? "var(--accent)"
                        : "var(--border-strong)",
                  }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--text)]">
                      {s.label}
                    </span>
                    <span className="shrink-0 text-[11px] text-[var(--text-dim)]">
                      {formatMiles(s.distanceMiles)} ·{" "}
                      {formatMinutes(s.durationMinutes)}
                    </span>
                  </div>
                  {s.kind === "road" && (
                    <p className="text-[11px] text-[var(--text-dim)]">
                      {s.difficulty} · {s.surfaceQuality} surface
                      {s.hazards && s.hazards.length
                        ? ` · ${s.hazards.join(", ")}`
                        : ""}
                    </p>
                  )}
                  {s.notes?.map((n, j) => (
                    <p
                      key={j}
                      className="text-[11px] text-[color:var(--accent)]"
                    >
                      ⚠ {n}
                    </p>
                  ))}
                </li>
              ))}
            </ol>
          </div>
        )}
      </aside>
    </div>
  );
}
