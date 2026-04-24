"use client";

import { useMemo, useState } from "react";
import type { Road } from "@/lib/roads/types";
import { RoadList } from "./road-list";
import { RoadDetail } from "./road-detail";
import { RoadsMap } from "./roads-map";

type Props = { roads: Road[] };

export function RoadsExplorer({ roads }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const selectedIndex = useMemo(
    () => (selectedId ? roads.findIndex((r) => r.id === selectedId) : -1),
    [roads, selectedId],
  );
  const selected = selectedIndex >= 0 ? roads[selectedIndex] : null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const handleBack = () => setDetailOpen(false);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#fafaf8] dark:bg-zinc-950">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-baseline gap-3">
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Driver&rsquo;s Guide
          </span>
          <span className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:inline">
            Great roads, mapped.
          </span>
        </div>
        <div className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {roads.length} {roads.length === 1 ? "road" : "roads"}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative order-last min-h-[55vh] flex-1 lg:order-first lg:min-h-0">
          <RoadsMap
            roads={roads}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>

        <aside
          className={[
            "flex min-h-0 shrink-0 flex-col border-zinc-200 bg-[#fafaf8] dark:border-zinc-800 dark:bg-zinc-950",
            "border-b lg:w-[420px] lg:border-b-0 lg:border-l",
          ].join(" ")}
        >
          {detailOpen && selected ? (
            <RoadDetail
              road={selected}
              index={selectedIndex}
              onBack={handleBack}
            />
          ) : (
            <>
              <div className="flex items-baseline justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  Curated drives
                </h2>
                {selected && (
                  <button
                    type="button"
                    onClick={() => setDetailOpen(true)}
                    className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    View details →
                  </button>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <RoadList
                  roads={roads}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                />
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
