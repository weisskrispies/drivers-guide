"use client";

import { useEffect, useRef } from "react";
import type { Road } from "@/lib/roads/types";

const DIFFICULTY_LABEL: Record<NonNullable<Road["difficulty"]>, string> = {
  easy: "Easy",
  moderate: "Moderate",
  spirited: "Spirited",
  expert: "Expert",
};

const DIFFICULTY_COLOR: Record<NonNullable<Road["difficulty"]>, string> = {
  easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  moderate: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  spirited: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  expert: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

type Props = {
  roads: Road[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function RoadList({ roads, selectedId, onSelect }: Props) {
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!selectedId) return;
    const el = itemRefs.current.get(selectedId);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {roads.map((road) => {
        const selected = road.id === selectedId;
        return (
          <li key={road.id}>
            <button
              type="button"
              ref={(el) => {
                if (el) itemRefs.current.set(road.id, el);
                else itemRefs.current.delete(road.id);
              }}
              onClick={() => onSelect(road.id)}
              aria-current={selected ? "true" : undefined}
              className={[
                "block w-full text-left px-5 py-4 transition-colors",
                selected
                  ? "bg-red-50 dark:bg-red-950/30"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {road.name}
                  </h3>
                  {road.region && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {road.region}
                    </p>
                  )}
                </div>
                {road.difficulty && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLOR[road.difficulty]}`}
                  >
                    {DIFFICULTY_LABEL[road.difficulty]}
                  </span>
                )}
              </div>
              {road.summary && (
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2">
                  {road.summary}
                </p>
              )}
              <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                {road.distance_miles != null && (
                  <div>
                    <dt className="sr-only">Distance</dt>
                    <dd>{road.distance_miles} mi</dd>
                  </div>
                )}
                {road.est_drive_minutes != null && (
                  <div>
                    <dt className="sr-only">Drive time</dt>
                    <dd>~{road.est_drive_minutes} min</dd>
                  </div>
                )}
                {road.elevation_gain_ft != null && (
                  <div>
                    <dt className="sr-only">Elevation gain</dt>
                    <dd>{road.elevation_gain_ft.toLocaleString()} ft gain</dd>
                  </div>
                )}
              </dl>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
