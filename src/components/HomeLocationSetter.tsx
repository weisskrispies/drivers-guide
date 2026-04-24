"use client";

import { useState } from "react";
import type { HomeLocation } from "@/lib/storage";

type Props = {
  home: HomeLocation | null;
  onSave: (next: HomeLocation | null) => void;
};

// Quick presets covering the major Bay Area origins. Users can also paste a
// "lat, lng" pair or click the map (future) to set home.
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
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <span aria-hidden>🏠</span>
        <span className="max-w-[10rem] truncate">
          {home ? home.label : "Set home"}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Pick a starting point
          </div>
          <ul className="mb-3 grid grid-cols-2 gap-1">
            {PRESETS.map((p) => (
              <li key={p.label}>
                <button
                  type="button"
                  onClick={() => {
                    onSave(p);
                    setOpen(false);
                  }}
                  className={[
                    "w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800",
                    home?.label === p.label ? "bg-amber-50 dark:bg-amber-950/40" : "",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Or paste lat, lng
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="37.77, -122.42"
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="button"
              onClick={handleCustom}
              className="rounded-md bg-zinc-900 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Set
            </button>
          </div>
          {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
          {home && (
            <button
              type="button"
              onClick={() => {
                onSave(null);
                setOpen(false);
              }}
              className="mt-3 w-full text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Clear home location
            </button>
          )}
        </div>
      )}
    </div>
  );
}
