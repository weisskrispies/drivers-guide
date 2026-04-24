"use client";

import { levelForCount } from "@/lib/gamification";

export default function LevelBadge({
  count,
  total,
}: {
  count: number;
  total: number;
}) {
  const { level, next, progress } = levelForCount(count);
  const pct = Math.round(progress * 100);

  return (
    <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm dark:border-zinc-800 dark:from-amber-950/40 dark:to-zinc-950">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Current rank
          </div>
          <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {level.title}
          </div>
        </div>
        <div className="text-right text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {count}
          </span>
          <span> / {total} roads</span>
        </div>
      </div>
      <p className="mt-2 text-sm italic text-zinc-600 dark:text-zinc-400">
        {level.blurb}
      </p>
      {next ? (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {next.threshold - count} more to <strong>{next.title}</strong>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-amber-600">
          Max rank — the mountains are yours.
        </div>
      )}
    </div>
  );
}
