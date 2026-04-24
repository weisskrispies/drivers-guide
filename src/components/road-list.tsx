"use client";

import { useEffect, useRef } from "react";
import type { Road } from "@/lib/roads/types";

const DIFFICULTY_LABEL: Record<NonNullable<Road["difficulty"]>, string> = {
  easy: "Easy",
  moderate: "Moderate",
  spirited: "Spirited",
  expert: "Expert",
};

const DIFFICULTY_TONE: Record<NonNullable<Road["difficulty"]>, string> = {
  easy: "text-emerald-700 dark:text-emerald-400",
  moderate: "text-sky-700 dark:text-sky-400",
  spirited: "text-amber-700 dark:text-amber-400",
  expert: "text-red-700 dark:text-red-400",
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
    <ol className="flex flex-col gap-2 p-4">
      {roads.map((road, index) => {
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
                "group flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                selected
                  ? "border-zinc-900 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.06)] dark:border-zinc-100 dark:bg-zinc-900"
                  : "border-transparent bg-white/70 hover:border-zinc-200 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] dark:bg-zinc-900/40 dark:hover:border-zinc-800 dark:hover:bg-zinc-900",
              ].join(" ")}
            >
              <span
                className={[
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                  selected
                    ? "bg-red-600 text-white"
                    : "bg-zinc-100 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white dark:bg-zinc-800 dark:text-zinc-200",
                ].join(" ")}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {road.name}
                </h3>
                {road.region && (
                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {road.region}
                  </p>
                )}
                <div className="mt-2.5 flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                  {road.distance_miles != null && (
                    <span className="tabular-nums">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {road.distance_miles}
                      </span>{" "}
                      mi
                    </span>
                  )}
                  {road.est_drive_minutes != null && (
                    <span className="tabular-nums">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {road.est_drive_minutes}
                      </span>{" "}
                      min
                    </span>
                  )}
                  {road.difficulty && (
                    <span
                      className={`font-medium ${DIFFICULTY_TONE[road.difficulty]}`}
                    >
                      {DIFFICULTY_LABEL[road.difficulty]}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
