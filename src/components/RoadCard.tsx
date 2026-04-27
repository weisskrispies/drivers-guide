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
  /** Compact mode renders a short header + stat row only — no summary,
   *  chips, or hazard rows. Used in the mobile carousel where the card
   *  needs to leave most of the map visible. */
  compact?: boolean;
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
  spirited: "text-[#c2410c] dark:text-amber-400",
  expert: "text-red-600 dark:text-red-400",
};

export default function RoadCard({
  road,
  index,
  distanceFromOrigin,
  originLabel,
  done,
  active,
  compact,
  onSelect,
  onOpen,
}: Props) {
  // Compact: single-tap opens the modal — the carousel makes selection
  // happen via swipe, so a tap on the visible card is the user asking
  // for more detail.
  const handleClick = compact ? onOpen : onSelect;
  return (
    <article
      onClick={handleClick}
      onDoubleClick={onOpen}
      className={[
        "group relative cursor-pointer overflow-hidden rounded-2xl border bg-[var(--surface)] transition-colors",
        compact
          ? "p-3"
          : active
            ? "p-5"
            : "p-4 sm:p-5",
        active
          ? "border-2 border-[color:var(--accent)] shadow-[0_0_0_1px_var(--accent),0_18px_48px_-16px_rgba(252,82,0,0.45)]"
          : "border border-[var(--border)] shadow-[var(--shadow-card)] hover:border-[var(--border-strong)]",
        done ? "opacity-75" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            "mt-0.5 flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums transition-colors",
            active
              ? compact
                ? "h-7 w-7 bg-[color:var(--accent)] text-[12px] text-white"
                : "h-9 w-9 bg-[color:var(--accent)] text-[13px] text-white"
              : compact
                ? "h-7 w-7 bg-[var(--surface-2)] text-[12px] text-[var(--text-muted)]"
                : "h-8 w-8 bg-[var(--surface-2)] text-[12px] text-[var(--text-muted)] group-hover:bg-[color:var(--accent)] group-hover:text-white",
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
              "mt-1 font-semibold leading-snug tracking-tight text-[var(--text)]",
              compact ? "truncate text-[15px]" : active ? "text-[17px]" : "text-[15px]",
              done
                ? "line-through decoration-[color:var(--accent)] decoration-2"
                : "",
            ].join(" ")}
          >
            {road.name}
          </h3>
        </div>
        {done && (
          <span
            aria-label="Driven"
            title="Driven"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path
                fillRule="evenodd"
                d="M16.704 5.29a1 1 0 0 1 0 1.42l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.42L8 12.58l7.29-7.29a1 1 0 0 1 1.414 0Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
      </div>

      {compact ? (
        <dl className="mt-2.5 flex items-center gap-3 text-[12px] tabular-nums">
          <span className="font-semibold text-[var(--text)]">
            {formatMiles(road.distanceMiles)}
          </span>
          <Sep />
          <span className="font-semibold text-[var(--text)]">
            {formatMinutes(road.estDriveMinutes)}
          </span>
          <Sep />
          <span className="font-semibold text-[var(--text)]">
            +{Math.round(road.elevationGainFt).toLocaleString()}ʹ
          </span>
          <Sep />
          <span
            className={["font-semibold", DIFFICULTY_TONE[road.difficulty]].join(
              " ",
            )}
          >
            {DIFFICULTY_LABEL[road.difficulty]}
          </span>
        </dl>
      ) : (
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
      )}

      {!compact && active && (
        <div className="mt-4 space-y-3.5 border-t border-[var(--border)] pt-4">
          <p className="text-[13.5px] leading-relaxed text-[var(--text-muted)]">
            {road.summary}
          </p>

          {road.characteristics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {road.characteristics.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-[11px] text-[var(--text-muted)]"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          <dl className="space-y-1.5 text-[12px]">
            {road.bestTime && <Row label="Best time" value={road.bestTime} />}
            {road.hazards.length > 0 && (
              <Row label="Watch for" value={road.hazards.join(" · ")} warn />
            )}
          </dl>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[color:var(--accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[color:var(--accent-hover)]"
          >
            Open route
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

function Sep() {
  return (
    <span aria-hidden className="text-[var(--text-dim)]">
      ·
    </span>
  );
}

function Row({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
        {label}
      </dt>
      <dd
        className={[
          "min-w-0 flex-1 truncate",
          warn
            ? "font-semibold text-[#c2410c] dark:text-amber-300"
            : "text-[var(--text-muted)]",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
