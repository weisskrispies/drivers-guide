"use client";

import { useEffect } from "react";
import type { Road } from "@/lib/roads/types";
import { formatMiles, formatMinutes } from "@/lib/geo";

type Props = {
  road: Road;
  distanceFromOrigin: number | null;
  originLabel: string | null;
  done: boolean;
  onToggleDone: () => void;
  onClose: () => void;
};

const DIFFICULTY_LABEL: Record<Road["difficulty"], string> = {
  easy: "Easy",
  moderate: "Moderate",
  spirited: "Spirited",
  expert: "Expert",
};

const DIFFICULTY_TONE: Record<Road["difficulty"], string> = {
  easy: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  moderate: "bg-sky-500/10 text-sky-300 ring-sky-500/30",
  spirited: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  expert: "bg-red-500/10 text-red-300 ring-red-500/30",
};

const SURFACE_LABEL: Record<Road["surfaceQuality"], string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  mixed: "Mixed",
};

export default function RoadFocused({
  road,
  distanceFromOrigin,
  originLabel,
  done,
  onToggleDone,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={road.name}
        className="relative flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_30px_80px_rgba(0,0,0,0.6)] sm:max-w-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />
            Route detail
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            aria-label="Close"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <header className="px-6 pt-6">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-dim)]">
              <span>{road.region}</span>
              {distanceFromOrigin !== null && originLabel && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    {formatMiles(distanceFromOrigin)} from {originLabel}
                  </span>
                </>
              )}
            </div>
            <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-[var(--text)]">
              {road.name}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-muted)]">
              {road.summary}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={[
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                  DIFFICULTY_TONE[road.difficulty],
                ].join(" ")}
              >
                {DIFFICULTY_LABEL[road.difficulty]}
              </span>
              <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-[11px] text-[var(--text-muted)]">
                {SURFACE_LABEL[road.surfaceQuality]} surface
              </span>
            </div>
          </header>

          <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden border-y border-[var(--border)] bg-[var(--border)]">
            <Stat label="Miles" value={formatMiles(road.distanceMiles)} />
            <Stat label="Drive time" value={formatMinutes(road.estDriveMinutes)} />
            <Stat
              label="Elevation"
              value={`+${Math.round(road.elevationGainFt).toLocaleString()} ft`}
            />
          </dl>

          <div className="space-y-6 px-6 py-6">
            <p className="text-[14px] leading-relaxed text-[var(--text)]">
              {road.description}
            </p>

            <Section title="Start · End">
              <p className="text-sm text-[var(--text-muted)]">
                <span className="text-[var(--text)]">{road.start.label}</span>
                <span className="mx-2 text-[var(--text-dim)]">→</span>
                <span className="text-[var(--text)]">{road.end.label}</span>
              </p>
            </Section>

            {road.characteristics.length > 0 && (
              <Section title="Characteristics">
                <div className="flex flex-wrap gap-1.5">
                  {road.characteristics.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[12px] text-[var(--text-muted)]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {road.hazards.length > 0 && (
              <Section title="Watch for">
                <ul className="space-y-1.5">
                  {road.hazards.map((h) => (
                    <li
                      key={h}
                      className="flex items-start gap-2 text-sm text-[var(--text-muted)]"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400"
                        aria-hidden
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.515 2.625H3.72c-1.345 0-2.188-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Best time">
              <p className="text-sm text-[var(--text-muted)]">
                {road.bestTime}
              </p>
            </Section>

            <Section title="Traffic">
              <p className="text-sm text-[var(--text-muted)]">
                {road.trafficNotes}
              </p>
            </Section>

            {road.sources.length > 0 && (
              <Section title="Sources">
                <ul className="space-y-1">
                  {road.sources.map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[color:var(--accent)] underline-offset-2 hover:underline"
                      >
                        {s.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg)] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onToggleDone}
            aria-pressed={done}
            className={[
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              done
                ? "bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)]"
                : "bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-hover)]",
            ].join(" ")}
          >
            {done ? (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path
                    fillRule="evenodd"
                    d="M16.704 5.29a1 1 0 0 1 0 1.42l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.42L8 12.58l7.29-7.29a1 1 0 0 1 1.414 0Z"
                    clipRule="evenodd"
                  />
                </svg>
                Driven
              </>
            ) : (
              "Mark as driven"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--surface)] px-5 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-[var(--text)]">
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
        {title}
      </h3>
      {children}
    </section>
  );
}
