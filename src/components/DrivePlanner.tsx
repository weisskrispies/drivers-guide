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

const PRESETS: PlannerStart[] = [
  { label: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { label: "Oakland", lat: 37.8044, lng: -122.2712 },
  { label: "Berkeley", lat: 37.8715, lng: -122.273 },
  { label: "Palo Alto", lat: 37.4419, lng: -122.143 },
  { label: "San Jose", lat: 37.3382, lng: -121.8863 },
  { label: "Mill Valley", lat: 37.906, lng: -122.545 },
];

const DIFFICULTIES: Difficulty[] = ["easy", "moderate", "spirited", "expert"];

type Props = {
  roads: Road[];
  home: HomeLocation | null;
  currentLocation: LatLng | null;
  onRequestGeo: () => void;
  usingGps: boolean;
  theme: Theme;
};

function nextSaturday9am(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T09:00`;
}

function mapsLinks(plan: DrivePlan) {
  const o = `${plan.start.lat},${plan.start.lng}`;
  const entries = plan.segments
    .filter((s) => s.kind === "road" && s.path.length > 0)
    .map((s) => s.path[0]);
  const last = plan.segments[plan.segments.length - 1];
  const lastC = last?.path[last.path.length - 1];
  const dest = plan.loop ? o : lastC ? `${lastC[1]},${lastC[0]}` : o;
  const wpArr = entries.slice(0, 9).map(([lng, lat]) => `${lat},${lng}`);
  const google =
    `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${dest}` +
    (wpArr.length
      ? `&waypoints=${encodeURIComponent(wpArr.join("|"))}`
      : "") +
    `&travelmode=driving`;
  const apple = `https://maps.apple.com/?saddr=${o}&daddr=${dest}&dirflg=d`;
  return { google, apple };
}

export default function DrivePlanner({
  roads,
  home,
  currentLocation,
  onRequestGeo,
  usingGps,
  theme,
}: Props) {
  const [start, setStart] = useState<PlannerStart | null>(
    home ?? PRESETS[1],
  );
  const [pickMode, setPickMode] = useState<"start" | "stop">("start");
  const [stops, setStops] = useState<PlannerStart[]>([]);
  const [targetKind, setTargetKind] = useState<"duration" | "distance">(
    "duration",
  );
  const [targetValue, setTargetValue] = useState(120);
  const [dateTime, setDateTime] = useState(nextSaturday9am);
  const [maxDifficulty, setMaxDifficulty] = useState<Difficulty>("expert");
  const [loop, setLoop] = useState(true);
  const [plan, setPlan] = useState<DrivePlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveStart = start;

  function handlePick(p: { lat: number; lng: number }) {
    if (pickMode === "start") {
      setStart({ ...p, label: "Picked point" });
    } else {
      setStops((s) => [...s, { ...p, label: `Stop ${s.length + 1}` }]);
    }
  }

  function run() {
    if (!effectiveStart) {
      setError("Choose a start point.");
      return;
    }
    if (
      targetKind === "duration"
        ? targetValue < 15 || targetValue > 600
        : targetValue < 5 || targetValue > 400
    ) {
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
        start: effectiveStart,
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

  const mapSegments = useMemo(() => plan?.segments ?? [], [plan]);
  const links = plan ? mapsLinks(plan) : null;

  return (
    <div className="mx-auto flex min-h-0 w-full flex-1 flex-col md:max-w-[1600px] md:flex-row md:gap-6 md:px-4 md:py-4 lg:gap-8 lg:px-8 lg:py-6">
      <main className="relative order-2 min-h-[320px] flex-1 overflow-hidden md:order-1 md:rounded-3xl md:border md:border-[var(--border)] md:bg-[var(--surface)] md:shadow-[var(--shadow-card)]">
        <PlannerMap
          segments={mapSegments}
          start={effectiveStart}
          stops={stops}
          theme={theme}
          onPick={handlePick}
        />
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-[var(--surface)]/90 px-3 py-1 text-[11px] text-[var(--text-muted)] shadow">
          Tap the map to set the{" "}
          <span className="font-semibold text-[color:var(--accent)]">
            {pickMode}
          </span>
        </div>
      </main>

      <aside className="order-1 flex w-full shrink-0 flex-col gap-4 overflow-y-auto md:order-2 md:w-[400px] lg:w-[440px]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          {/* Start */}
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
            Start
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (currentLocation)
                  setStart({ ...currentLocation, label: "My location" });
                else onRequestGeo();
              }}
              className={`rounded-full border px-3 py-1 text-xs ${
                usingGps && start?.label === "My location"
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[color:var(--accent)]"
                  : "border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {usingGps ? "My location" : "Use GPS"}
            </button>
            {home && (
              <button
                type="button"
                onClick={() => setStart(home)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  start?.label === home.label
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[color:var(--accent)]"
                    : "border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                Home
              </button>
            )}
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setStart(p)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  start?.lat === p.lat && start?.lng === p.lng
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[color:var(--accent)]"
                    : "border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-dim)]">
            {effectiveStart
              ? `${effectiveStart.label ?? "Start"} · ${effectiveStart.lat.toFixed(
                  3,
                )}, ${effectiveStart.lng.toFixed(3)}`
              : "No start chosen — or tap the map."}
          </p>

          {/* Target */}
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

          {/* When */}
          <h3 className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
            When
          </h3>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          />

          {/* Limits */}
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

          {/* Stops */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPickMode((m) => (m === "start" ? "stop" : "start"))
              }
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              {pickMode === "stop"
                ? "Tapping adds stops ✓"
                : "Add stops by map tap"}
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

            {plan.notes.length > 0 && (
              <ul className="mt-2 space-y-1 text-[11px] text-[var(--text-muted)]">
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
                      s.kind === "road" ? "var(--accent)" : "var(--border-strong)",
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
                    <p key={j} className="text-[11px] text-[color:var(--accent)]">
                      ⚠ {n}
                    </p>
                  ))}
                </li>
              ))}
            </ol>

            {links && (
              <div className="mt-4 flex gap-2">
                <a
                  href={links.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-full border border-[var(--border)] px-3 py-2 text-center text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
                >
                  Google Maps
                </a>
                <a
                  href={links.apple}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-full border border-[var(--border)] px-3 py-2 text-center text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
                >
                  Apple Maps
                </a>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
