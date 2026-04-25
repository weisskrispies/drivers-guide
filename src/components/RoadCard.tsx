"use client";

import type { Road } from "@/lib/roads/types";
import { formatMiles, formatMinutes } from "@/lib/geo";

type Props = {
  road: Road;
  index: number;
  distanceFromOrigin: number | null;
  originLabel: string | null;
  done: boolean;
  active: boolean;
  onToggleDone: () => void;
  onSelect: () => void;
  onOpen: () => void;
};

const DIFFICULTY_LABEL: Record<Road["difficulty"], string> = {
  easy: "Easy",
  moderate: "Moderate",
  spirited: "Spirited",
  expert: "Expert",
};

const DIFFICULTY_TONE: Record<Road["difficulty"], string> = {
  easy: "text-emerald-600 dark:text-emerald-400",
  moderate: "text-sky-600 dark:text-sky-400",
  spirited: "text-amber-600 dark:text-amber-400",
  expert: "text-red-600 dark:text-red-400",
};

export default function RoadCard({
  road,
  index,
  distanceFromOrigin,
  originLabel,
  done,
  active,
  onToggleDone,
  onSelect,
  onOpen,
}: Props) {
  return (
    <article
      onClick={onSelect}
      onDoubleClick={onOpen}
      className={[
        "group relative cursor-pointer overflow-hidden rounded-2xl border bg-[var(--surface)] transition-colors",
        "p-4 sm:p-5",
        active
          ? "border-[color:var(--accent)] shadow-[0_0_0_1px_var(--accent),var(--shadow-card)]"
          : "border-[var(--border)] shadow-[var(--shadow-card)] hover:border-[var(--border-strong)]",
        done ? "opacity-75" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={[
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-colors",
            active
              ? "bg-[color:var(--accent)] text-white"
              : "bg-[var(--surface-2)] text-[var(--text-muted)] group-hover:bg-[color:var(--accent)] group-hover:text-white",
          ].join(" ")}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--text-dim)]">
            <span className="truncate">{road.region}</span>
            {distanceFromOrigin !== null && originLabel && (
              <>
                <span aria-hidden>·</span>
                <span className="whitespace-nowrap">
                  {formatMiles(distanceFromOrigin)} from {originLabel}
                </span>
              </>
            )}
          </div>
          <h3
            className={[
              "mt-1 text-[15px] font-semibold leading-snug tracking-tight text-[var(--text)]",
              done
                ? "line-through decoration-[color:var(--accent)] decoration-2"
                : "",
            ].join(" ")}
          >
            {road.name}
          </h3>
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
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm transition-colors",
            done
              ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-hover)]"
              : "border-[var(--border-strong)] bg-transparent text-[var(--text-dim)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]",
          ].join(" ")}
        >
          {done ? "✓" : ""}
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-4 gap-2">
        <Stat label="Miles" value={formatMiles(road.distanceMiles)} />
        <Stat label="Time" value={formatMinutes(road.estDriveMinutes)} />
        <Stat
          label="Elev"
          value={`+${Math.round(road.elevationGainFt).toLocaleString()}ʹ`}
        />
        <Stat
          label="Grade"
          value={DIFFICULTY_LABEL[road.difficulty]}
          tone={DIFFICULTY_TONE[road.difficulty]}
        />
      </dl>

      {active && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3.5">
          <p className="line-clamp-2 text-[12.5px] leading-snug text-[var(--text-muted)]">
            {road.summary}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color:var(--accent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--accent)] transition-colors hover:bg-[var(--accent-soft)]"
          >
            Open
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
              <path
                fillRule="evenodd"
                d="M7.22 14.78a.75.75 0 0 0 1.06 0l5-5a.75.75 0 0 0 0-1.06l-5-5a.75.75 0 0 0-1.06 1.06L11.69 9H3.75a.75.75 0 0 0 0 1.5h7.94l-4.47 4.22a.75.75 0 0 0 0 1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}
    </article>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg bg-[var(--surface-2)] px-2.5 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
        {label}
      </div>
      <div
        className={[
          "mt-0.5 truncate text-[13px] font-semibold tabular-nums tracking-tight",
          tone ?? "text-[var(--text)]",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}
