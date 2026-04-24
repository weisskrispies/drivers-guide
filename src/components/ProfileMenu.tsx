"use client";

import { useEffect, useRef, useState } from "react";
import type { HomeLocation } from "@/lib/storage";
import { levelForCount } from "@/lib/gamification";

type SortBy = "distance" | "length" | "difficulty";

type Props = {
  doneCount: number;
  total: number;
  home: HomeLocation | null;
  onSaveHome: (next: HomeLocation | null) => void;
  onRequestGeo: () => void;
  usingGps: boolean;
  geoError: string | null;
  sortBy: SortBy;
  onSortChange: (v: SortBy) => void;
  showDone: boolean;
  onShowDoneChange: (v: boolean) => void;
  onResetProgress: () => void;
};

const PRESETS: HomeLocation[] = [
  { label: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { label: "Oakland", lat: 37.8044, lng: -122.2712 },
  { label: "Berkeley", lat: 37.8715, lng: -122.273 },
  { label: "Palo Alto", lat: 37.4419, lng: -122.143 },
  { label: "San Jose", lat: 37.3382, lng: -121.8863 },
  { label: "Mill Valley", lat: 37.906, lng: -122.545 },
  { label: "Walnut Creek", lat: 37.9101, lng: -122.0652 },
  { label: "Marin HQ", lat: 38.0834, lng: -122.7633 },
];

export default function ProfileMenu({
  doneCount,
  total,
  home,
  onSaveHome,
  onRequestGeo,
  usingGps,
  geoError,
  sortBy,
  onSortChange,
  showDone,
  onShowDoneChange,
  onResetProgress,
}: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { level, next, progress } = levelForCount(doneCount);
  const pct = Math.round(progress * 100);
  // Stroke dasharray on r=15 circle ≈ 2πr = 94.25.
  const dash = (progress * 94.25).toFixed(2);

  function handleCustom() {
    setCustomError(null);
    const parts = custom
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length !== 2) {
      setCustomError("Use the format: lat, lng");
      return;
    }
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setCustomError("Not valid numbers");
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setCustomError("Out of range");
      return;
    }
    onSaveHome({ label: "Custom", lat, lng });
    setCustom("");
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile and settings"
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
      >
        {/* progress ring */}
        <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="18" cy="18" r="15" stroke="var(--surface-3)" strokeWidth="2" fill="none" />
          <circle
            cx="18"
            cy="18"
            r="15"
            stroke="var(--accent)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} 94.25`}
            className="transition-[stroke-dasharray] duration-500"
          />
        </svg>
        <span className="relative text-[12px] font-semibold tabular-nums">
          {doneCount}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
          {/* Rank */}
          <section>
            <div className="flex items-baseline justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
                {next ? "Current rank" : "Max rank"}
              </h3>
              <span className="text-[11px] tabular-nums text-[var(--text-muted)]">
                {doneCount} / {total}
              </span>
            </div>
            <div className="mt-1 text-lg font-semibold leading-tight tracking-tight text-[var(--text)]">
              {level.title}
            </div>
            <p className="mt-0.5 text-[12px] italic text-[var(--text-muted)]">
              {level.blurb}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className="h-full bg-[color:var(--accent)] transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1 text-[11px] text-[var(--text-muted)]">
              {next ? (
                <>
                  {next.threshold - doneCount} more to{" "}
                  <span className="text-[color:var(--accent)]">
                    {next.title}
                  </span>
                </>
              ) : (
                "The mountains are yours."
              )}
            </div>
          </section>

          <Divider />

          {/* Location */}
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
              Location
            </h3>
            <button
              type="button"
              onClick={onRequestGeo}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:border-[var(--border-strong)]"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-[color:var(--accent)]">
                <path d="M10 2a6 6 0 0 0-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 0 0-6-6Zm0 8.25a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Z" />
              </svg>
              {usingGps ? "GPS on" : "Use my location"}
            </button>
            {geoError && (
              <p className="mt-1 text-[11px] text-red-400">{geoError}</p>
            )}

            <div className="mt-3">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-dim)]">
                Home
              </div>
              <ul className="grid grid-cols-2 gap-1">
                {PRESETS.map((p) => {
                  const selected = home?.label === p.label;
                  return (
                    <li key={p.label}>
                      <button
                        type="button"
                        onClick={() => onSaveHome(p)}
                        className={[
                          "w-full rounded-md px-2 py-1.5 text-left text-[12px] transition-colors",
                          selected
                            ? "bg-[var(--accent-soft)] text-[color:var(--accent)]"
                            : "text-[var(--text)] hover:bg-[var(--surface-2)]",
                        ].join(" ")}
                      >
                        {p.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2 flex gap-1">
                <input
                  type="text"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCustom();
                  }}
                  placeholder="lat, lng"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCustom}
                  className="rounded-md bg-[color:var(--accent)] px-3 py-1 text-xs font-semibold text-white hover:bg-[color:var(--accent-hover)]"
                >
                  Set
                </button>
              </div>
              {customError && (
                <p className="mt-1 text-[11px] text-red-400">{customError}</p>
              )}
              {home && (
                <button
                  type="button"
                  onClick={() => onSaveHome(null)}
                  className="mt-2 text-[11px] text-[var(--text-dim)] underline-offset-2 hover:text-[var(--text)] hover:underline"
                >
                  Clear home
                </button>
              )}
            </div>
          </section>

          <Divider />

          {/* Display */}
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
              Display
            </h3>
            <div className="mt-2 flex items-center justify-between">
              <label
                htmlFor="sort-select"
                className="text-[12px] text-[var(--text-muted)]"
              >
                Sort
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortBy)}
                className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="distance">Nearest first</option>
                <option value="length">Longest first</option>
                <option value="difficulty">Most demanding</option>
              </select>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <label
                htmlFor="showdone-check"
                className="text-[12px] text-[var(--text-muted)]"
              >
                Show driven roads
              </label>
              <input
                id="showdone-check"
                type="checkbox"
                checked={showDone}
                onChange={(e) => onShowDoneChange(e.target.checked)}
                className="h-4 w-4 accent-[color:var(--accent)]"
              />
            </div>
          </section>

          {doneCount > 0 && (
            <>
              <Divider />
              <button
                type="button"
                onClick={() => {
                  if (
                    typeof window !== "undefined" &&
                    window.confirm("Clear all driven-road progress?")
                  ) {
                    onResetProgress();
                  }
                }}
                className="text-[11px] text-[var(--text-dim)] underline-offset-2 hover:text-red-400 hover:underline"
              >
                Reset progress
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div className="my-4 h-px w-full bg-[var(--border)]" />;
}
