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
    <div className="flex items-center gap-3">
      <div className="relative h-9 w-9 shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15"
            stroke="var(--surface-3)"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            stroke="var(--accent)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 94.25} 94.25`}
            className="transition-[stroke-dasharray] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums text-[var(--text)]">
          {count}
        </div>
      </div>
      <div className="min-w-0 leading-tight">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
          {next ? "Rank" : "Max rank"}
        </div>
        <div className="truncate text-[13px] font-semibold tracking-tight text-[var(--text)]">
          {level.title}
        </div>
        <div className="truncate text-[11px] text-[var(--text-muted)]">
          {next ? (
            <>
              {next.threshold - count} to{" "}
              <span className="text-[color:var(--accent)]">{next.title}</span>
            </>
          ) : (
            <span>The mountains are yours · {count}/{total}</span>
          )}
        </div>
      </div>
    </div>
  );
}
