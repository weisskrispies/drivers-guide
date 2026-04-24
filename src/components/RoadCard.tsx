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
  easy: "text-emerald-400",
  moderate: "text-sky-400",
  spirited: "text-amber-400",
  expert: "text-red-400",
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
        "group relative cursor-pointer overflow-hidden rounded-2xl border bg-[var(--surface)] p-3 transition-all",
        active
          ? "border-[color:var(--accent)] shadow-[0_0_0_1px_var(--accent),0_10px_28px_-10px_rgba(252,82,0,0.45)]"
          : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]",
        done ? "opacity-75" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <span
          className={[
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-colors",
            active
              ? "bg-[color:var(--accent)] text-white"
              : "bg-[var(--surface-3)] text-[var(--text-muted)] group-hover:bg-[color:var(--accent)] group-hover:text-white",
          ].join(" ")}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--text-dim)]">
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
              "mt-0.5 truncate text-[14px] font-semibold tracking-tight text-[var(--text)]",
              done ? "line-through decoration-[color:var(--accent)] decoration-2" : "",
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
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm transition-colors",
            done
              ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-hover)]"
              : "border-[var(--border-strong)] bg-transparent text-[var(--text-dim)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]",
          ].join(" ")}
        >
          {done ? "✓" : ""}
        </button>
      </div>

      <dl className="mt-2.5 flex items-center gap-2 text-[11px]">
        <Stat label="mi" value={formatMiles(road.distanceMiles)} />
        <Sep />
        <Stat label="time" value={formatMinutes(road.estDriveMinutes)} />
        <Sep />
        <Stat
          label="elev"
          value={`+${Math.round(road.elevationGainFt).toLocaleString()}ʹ`}
        />
        <Sep />
        <Stat
          label="grade"
          value={DIFFICULTY_LABEL[road.difficulty]}
          tone={DIFFICULTY_TONE[road.difficulty]}
        />
      </dl>

      {active && (
        <div className="mt-2.5 flex items-center justify-between border-t border-[var(--border)] pt-2.5">
          <p className="line-clamp-1 text-[12px] text-[var(--text-muted)]">
            {road.summary}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="ml-3 inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
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
    <div className="min-w-0 flex items-baseline gap-1">
      <span
        className={[
          "truncate text-[12px] font-semibold tabular-nums",
          tone ?? "text-[var(--text)]",
        ].join(" ")}
      >
        {value}
      </span>
      <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--text-dim)]">
        {label}
      </span>
    </div>
  );
}

function Sep() {
  return (
    <span aria-hidden className="text-[var(--text-dim)]/60">
      ·
    </span>
  );
}
