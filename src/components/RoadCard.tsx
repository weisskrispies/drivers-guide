"use client";

import type { Road } from "@/lib/roads/types";
import { formatMiles, formatMinutes } from "@/lib/geo";

type Props = {
  road: Road;
  distanceFromOrigin: number | null;
  originLabel: string | null;
  done: boolean;
  active: boolean;
  onToggleDone: () => void;
  onSelect: () => void;
};

const DIFFICULTY_LABEL: Record<Road["difficulty"], string> = {
  easy: "Easy",
  moderate: "Moderate",
  spirited: "Spirited",
  expert: "Expert",
};

const DIFFICULTY_COLOR: Record<Road["difficulty"], string> = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  moderate: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  spirited: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  expert: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

const SURFACE_LABEL: Record<Road["surfaceQuality"], string> = {
  excellent: "Excellent surface",
  good: "Good surface",
  fair: "Fair surface",
  poor: "Poor surface",
  mixed: "Mixed surface",
};

export default function RoadCard({
  road,
  distanceFromOrigin,
  originLabel,
  done,
  active,
  onToggleDone,
  onSelect,
}: Props) {
  return (
    <article
      onClick={onSelect}
      className={[
        "group cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-zinc-950",
        active
          ? "border-amber-400 ring-2 ring-amber-200 dark:border-amber-500 dark:ring-amber-900"
          : "border-zinc-200 dark:border-zinc-800",
        done ? "opacity-80" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>{road.region}</span>
            {distanceFromOrigin !== null && originLabel && (
              <>
                <span aria-hidden>•</span>
                <span>
                  {formatMiles(distanceFromOrigin)} from {originLabel}
                </span>
              </>
            )}
          </div>
          <h3
            className={[
              "mt-0.5 text-lg font-semibold leading-tight text-zinc-900 dark:text-zinc-50",
              done ? "line-through decoration-emerald-500 decoration-2" : "",
            ].join(" ")}
          >
            {road.name}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {road.summary}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone();
          }}
          aria-pressed={done}
          aria-label={done ? "Mark as not driven" : "Mark as driven"}
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold transition-colors",
            done
              ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600"
              : "border-zinc-300 bg-white text-zinc-400 hover:border-emerald-500 hover:text-emerald-500 dark:border-zinc-700 dark:bg-zinc-900",
          ].join(" ")}
        >
          {done ? "✓" : ""}
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-y-1 gap-x-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Length</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatMiles(road.distanceMiles)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Elevation</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-100">
            +{road.elevationGainFt.toLocaleString()} ft
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Drive time</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatMinutes(road.estDriveMinutes)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Surface</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-100">
            {SURFACE_LABEL[road.surfaceQuality]}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          className={[
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            DIFFICULTY_COLOR[road.difficulty],
          ].join(" ")}
        >
          {DIFFICULTY_LABEL[road.difficulty]}
        </span>
        {road.characteristics.map((c) => (
          <span
            key={c}
            className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {c}
          </span>
        ))}
      </div>

      {active && (
        <div className="mt-4 space-y-3 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
          <p className="text-zinc-700 dark:text-zinc-300">{road.description}</p>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Traffic & other users
            </div>
            <p className="text-zinc-700 dark:text-zinc-300">{road.trafficNotes}</p>
          </div>
          {road.hazards.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Watch for
              </div>
              <ul className="list-inside list-disc text-zinc-700 dark:text-zinc-300">
                {road.hazards.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Best time
            </div>
            <p className="text-zinc-700 dark:text-zinc-300">{road.bestTime}</p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Sources
            </div>
            <ul className="space-y-0.5">
              {road.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-sky-700 underline underline-offset-2 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {s.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </article>
  );
}
