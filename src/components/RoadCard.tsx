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
        "group relative cursor-pointer overflow-hidden rounded-2xl border bg-[var(--surface)] p-4 transition-all",
        active
          ? "border-[color:var(--accent)] shadow-[0_0_0_1px_var(--accent),0_10px_32px_-8px_rgba(252,82,0,0.35)]"
          : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]",
        done ? "opacity-80" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-colors",
            active
              ? "bg-[color:var(--accent)] text-white"
              : "bg-[var(--surface-3)] text-[var(--text-muted)] group-hover:bg-[color:var(--accent)] group-hover:text-white",
          ].join(" ")}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--text-dim)]">
            <span className="truncate">{road.region}</span>
            {distanceFromOrigin !== null && originLabel && (
              <>
                <span aria-hidden className="text-[var(--text-dim)]">
                  ·
                </span>
                <span>
                  {formatMiles(distanceFromOrigin)} from {originLabel}
                </span>
              </>
            )}
          </div>
          <h3
            className={[
              "mt-1 text-[15px] font-semibold leading-snug tracking-tight text-[var(--text)]",
              done ? "line-through decoration-[color:var(--accent)] decoration-2" : "",
            ].join(" ")}
          >
            {road.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-[13px] text-[var(--text-muted)]">
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
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm transition-colors",
            done
              ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-hover)]"
              : "border-[var(--border-strong)] bg-transparent text-[var(--text-dim)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]",
          ].join(" ")}
        >
          {done ? "✓" : ""}
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
        <StatPill label="MILES" value={formatMiles(road.distanceMiles)} />
        <StatPill label="TIME" value={formatMinutes(road.estDriveMinutes)} />
        <StatPill
          label="ELEV"
          value={`+${Math.round(road.elevationGainFt).toLocaleString()}ʹ`}
        />
        <StatPill
          label="GRADE"
          value={DIFFICULTY_LABEL[road.difficulty]}
          tone={DIFFICULTY_TONE[road.difficulty]}
        />
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {road.characteristics.slice(0, 3).map((c) => (
          <span
            key={c}
            className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]"
          >
            {c}
          </span>
        ))}
        {road.characteristics.length > 3 && (
          <span className="text-[10px] text-[var(--text-dim)]">
            +{road.characteristics.length - 3}
          </span>
        )}
      </div>

      {active && (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
          >
            Open route
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
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

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-md bg-[var(--surface-2)] px-2 py-1.5">
      <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-dim)]">
        {label}
      </div>
      <div
        className={[
          "mt-0.5 truncate text-[12px] font-semibold tabular-nums",
          tone ?? "text-[var(--text)]",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}
