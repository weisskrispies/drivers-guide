"use client";

import { useEffect } from "react";
import type { Road } from "@/lib/roads/types";

const DIFFICULTY_LABEL: Record<NonNullable<Road["difficulty"]>, string> = {
  easy: "Easy",
  moderate: "Moderate",
  spirited: "Spirited",
  expert: "Expert",
};

const DIFFICULTY_TONE: Record<NonNullable<Road["difficulty"]>, string> = {
  easy: "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-400/20",
  moderate: "bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-400/20",
  spirited: "bg-amber-50 text-amber-900 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-400/20",
  expert: "bg-red-50 text-red-800 ring-red-600/20 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-400/20",
};

type Props = {
  road: Road;
  index: number;
  onBack: () => void;
};

export function RoadDetail({ road, index, onBack }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  return (
    <article className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M12.78 15.53a.75.75 0 0 1-1.06 0l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L8.31 10l4.47 4.47a.75.75 0 0 1 0 1.06Z"
              clipRule="evenodd"
            />
          </svg>
          All roads
        </button>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white tabular-nums">
          {index + 1}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="px-6 pt-6">
          {road.region && (
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              {road.region}
            </p>
          )}
          <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
            {road.name}
          </h2>
          {road.summary && (
            <p className="mt-3 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">
              {road.summary}
            </p>
          )}
          {road.difficulty && (
            <span
              className={`mt-4 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${DIFFICULTY_TONE[road.difficulty]}`}
            >
              {DIFFICULTY_LABEL[road.difficulty]}
            </span>
          )}
        </header>

        <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden border-y border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800">
          {road.distance_miles != null && (
            <Stat label="Distance" value={road.distance_miles} unit="mi" />
          )}
          {road.est_drive_minutes != null && (
            <Stat
              label="Drive time"
              value={road.est_drive_minutes}
              unit="min"
            />
          )}
          {road.elevation_gain_ft != null && (
            <Stat
              label="Elevation"
              value={road.elevation_gain_ft.toLocaleString()}
              unit="ft"
            />
          )}
        </dl>

        <div className="space-y-6 px-6 py-6">
          {road.description && (
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {road.description}
            </p>
          )}

          {road.characteristics.length > 0 && (
            <Section title="Characteristics">
              <div className="flex flex-wrap gap-1.5">
                {road.characteristics.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {road.hazards.length > 0 && (
            <Section title="Hazards">
              <div className="flex flex-wrap gap-1.5">
                {road.hazards.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-900 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-400/20"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3 w-3"
                      aria-hidden
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.515 2.625H3.72c-1.345 0-2.188-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {item}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {road.best_time && (
            <Section title="Best time">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {road.best_time}
              </p>
            </Section>
          )}

          {road.traffic_notes && (
            <Section title="Traffic">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {road.traffic_notes}
              </p>
            </Section>
          )}
        </div>
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit?: string;
}) {
  return (
    <div className="bg-white px-4 py-4 dark:bg-zinc-950">
      <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {value}
        </span>
        {unit && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {unit}
          </span>
        )}
      </dd>
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
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}
