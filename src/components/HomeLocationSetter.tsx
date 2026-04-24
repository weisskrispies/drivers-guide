"use client";

import { useEffect, useRef, useState } from "react";
import type { HomeLocation } from "@/lib/storage";

type Props = {
  home: HomeLocation | null;
  onSave: (next: HomeLocation | null) => void;
};

const PRESETS: HomeLocation[] = [
  { label: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { label: "Oakland", lat: 37.8044, lng: -122.2712 },
  { label: "Berkeley", lat: 37.8715, lng: -122.273 },
  { label: "Palo Alto", lat: 37.4419, lng: -122.143 },
  { label: "San Jose", lat: 37.3382, lng: -121.8863 },
  { label: "Mill Valley", lat: 37.906, lng: -122.545 },
  { label: "Walnut Creek", lat: 37.9101, lng: -122.0652 },
];

export default function HomeLocationSetter({ home, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
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

  function handleCustom() {
    setError(null);
    const parts = custom
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length !== 2) {
      setError("Use the format: lat, lng");
      return;
    }
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("Not valid numbers");
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Out of range");
      return;
    }
    onSave({ label: "Custom", lat, lng });
    setCustom("");
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-[color:var(--accent)]">
          <path d="M10.707 2.293a1 1 0 0 0-1.414 0l-7 7A1 1 0 0 0 3 11h1v6a1 1 0 0 0 1 1h3v-4a2 2 0 1 1 4 0v4h3a1 1 0 0 0 1-1v-6h1a1 1 0 0 0 .707-1.707l-7-7Z" />
        </svg>
        <span className="max-w-[10rem] truncate">
          {home ? home.label : "Set home"}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
            Starting point
          </div>
          <ul className="mb-3 grid grid-cols-2 gap-1">
            {PRESETS.map((p) => {
              const selected = home?.label === p.label;
              return (
                <li key={p.label}>
                  <button
                    type="button"
                    onClick={() => {
                      onSave(p);
                      setOpen(false);
                    }}
                    className={[
                      "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors",
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
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
            Or paste lat, lng
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCustom();
              }}
              placeholder="37.77, -122.42"
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
          {error && (
            <div className="mt-1 text-[11px] text-red-400">{error}</div>
          )}
          {home && (
            <button
              type="button"
              onClick={() => {
                onSave(null);
                setOpen(false);
              }}
              className="mt-3 w-full text-[11px] text-[var(--text-dim)] underline-offset-2 hover:text-[var(--text)] hover:underline"
            >
              Clear home location
            </button>
          )}
        </div>
      )}
    </div>
  );
}
