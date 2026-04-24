"use client";

import { useMemo, useState } from "react";
import type { Road } from "@/lib/roads/types";
import { RoadList } from "./road-list";
import { RoadDetail } from "./road-detail";
import { RoadsMap } from "./roads-map";

type Props = { roads: Road[] };

export function RoadsExplorer({ roads }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    roads[0]?.id ?? null,
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const selected = useMemo(
    () => roads.find((r) => r.id === selectedId) ?? null,
    [roads, selectedId],
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  return (
    <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[360px_1fr]">
      <aside className="flex min-h-0 flex-col border-b border-zinc-200 dark:border-zinc-800 lg:border-b-0 lg:border-r">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Driver&rsquo;s Guide
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {roads.length} curated road{roads.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <RoadList
            roads={roads}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>
      </aside>

      <div className="relative min-h-[60vh] lg:min-h-0">
        <RoadsMap
          roads={roads}
          selectedId={selectedId}
          onSelect={handleSelect}
        />

        {selected && detailOpen && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 sm:inset-auto sm:right-4 sm:top-4 sm:bottom-auto sm:w-96">
            <div className="pointer-events-auto max-h-[70vh] overflow-y-auto rounded-lg border border-zinc-200 bg-white/95 p-5 shadow-xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="float-right -mr-1 -mt-1 rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Close details"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
              <RoadDetail road={selected} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
