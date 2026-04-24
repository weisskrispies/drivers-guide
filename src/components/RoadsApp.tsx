"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ROADS } from "@/lib/roads/data";
import type { LatLng } from "@/lib/roads/types";
import { haversineMiles } from "@/lib/geo";
import { useCompletions, useHomeLocation } from "@/lib/storage";
import HomeLocationSetter from "./HomeLocationSetter";
import LevelBadge from "./LevelBadge";
import RoadCard from "./RoadCard";
import RoadFocused from "./RoadFocused";

// maplibre-gl touches `window` on import; keep the map client-only.
const RoadMap = dynamic(() => import("./RoadMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[var(--surface)] text-sm text-[var(--text-muted)]">
      Loading map…
    </div>
  ),
});

type SortBy = "distance" | "length" | "difficulty";

const DIFFICULTY_ORDER = {
  easy: 0,
  moderate: 1,
  spirited: 2,
  expert: 3,
} as const;

export default function RoadsApp() {
  const { home, setHome } = useHomeLocation();
  const { done, toggle } = useCompletions();

  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoRequested, setGeoRequested] = useState(false);

  const [sortBy, setSortBy] = useState<SortBy>("distance");
  const [showDone, setShowDone] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);

  const origin: { point: LatLng; label: string } | null = useMemo(() => {
    if (currentLocation) return { point: currentLocation, label: "you" };
    if (home) return { point: home, label: home.label };
    return null;
  }, [currentLocation, home]);

  const roadsWithDistance = useMemo(() => {
    return ROADS.map((road) => {
      const dist = origin
        ? haversineMiles(origin.point, {
            lat: road.start.lat,
            lng: road.start.lng,
          })
        : null;
      return { road, distance: dist };
    });
  }, [origin]);

  const visibleRoads = useMemo(() => {
    const filtered = showDone
      ? roadsWithDistance
      : roadsWithDistance.filter(({ road }) => !done.has(road.slug));

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortBy === "length") return b.road.distanceMiles - a.road.distanceMiles;
      if (sortBy === "difficulty")
        return (
          DIFFICULTY_ORDER[b.road.difficulty] -
          DIFFICULTY_ORDER[a.road.difficulty]
        );
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
    return sorted;
  }, [roadsWithDistance, sortBy, showDone, done]);

  // Derive the "effective" active slug so we don't sync state in an effect:
  // if the user's pick is still visible, use it; otherwise fall back to the
  // first visible road.
  const effectiveActiveSlug = useMemo(() => {
    if (activeSlug && visibleRoads.some((r) => r.road.slug === activeSlug)) {
      return activeSlug;
    }
    return visibleRoads[0]?.road.slug ?? null;
  }, [activeSlug, visibleRoads]);

  const handleSelect = useCallback((slug: string) => {
    setActiveSlug(slug);
  }, []);

  const handleOpen = useCallback((slug: string) => {
    setActiveSlug(slug);
    setFocusedSlug(slug);
  }, []);

  const handleCloseFocus = useCallback(() => setFocusedSlug(null), []);

  const requestGeo = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocation not available in this browser.");
      return;
    }
    setGeoRequested(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setGeoError(err.message || "Could not read your location.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  const focusedEntry = focusedSlug
    ? visibleRoads.find((r) => r.road.slug === focusedSlug) ?? null
    : null;

  const doneCount = done.size;

  return (
    <div className="flex h-[100svh] min-h-[100svh] flex-col">
      <TopBar
        currentLocation={currentLocation}
        onRequestGeo={requestGeo}
        geoRequested={geoRequested}
        home={home}
        onSaveHome={setHome}
      />

      <SubBar
        sortBy={sortBy}
        onSortChange={setSortBy}
        showDone={showDone}
        onShowDoneChange={setShowDone}
        doneCount={doneCount}
        total={ROADS.length}
        origin={origin}
        geoError={geoError}
        onRequestGeo={requestGeo}
      />

      <div className="relative flex min-h-0 flex-1">
        <main className="min-h-0 flex-1">
          <RoadMap
            roads={visibleRoads.map((r) => r.road)}
            done={done}
            home={home}
            currentLocation={currentLocation}
            activeSlug={effectiveActiveSlug}
            onSelect={handleSelect}
            onOpen={handleOpen}
          />
        </main>

        <aside className="hidden min-h-0 w-[420px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface)]/70 backdrop-blur md:flex">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {visibleRoads.length} road{visibleRoads.length === 1 ? "" : "s"}
            </h2>
          </div>
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {visibleRoads.length === 0 && (
              <li className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)]">
                You&rsquo;ve driven them all. Go submit new ones.
              </li>
            )}
            {visibleRoads.map(({ road, distance }, index) => (
              <li key={road.slug}>
                <RoadCard
                  road={road}
                  index={index}
                  distanceFromOrigin={distance}
                  originLabel={origin?.label ?? null}
                  done={done.has(road.slug)}
                  active={effectiveActiveSlug === road.slug}
                  onToggleDone={() => toggle(road.slug)}
                  onSelect={() => handleSelect(road.slug)}
                  onOpen={() => handleOpen(road.slug)}
                />
              </li>
            ))}
          </ul>
        </aside>

        {/* Mobile: bottom sheet with the active road card */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 md:hidden">
          {(() => {
            const active = visibleRoads.find(
              (r) => r.road.slug === effectiveActiveSlug,
            );
            if (!active) return null;
            const index = visibleRoads.indexOf(active);
            return (
              <div className="pointer-events-auto">
                <RoadCard
                  road={active.road}
                  index={index}
                  distanceFromOrigin={active.distance}
                  originLabel={origin?.label ?? null}
                  done={done.has(active.road.slug)}
                  active
                  onToggleDone={() => toggle(active.road.slug)}
                  onSelect={() => handleSelect(active.road.slug)}
                  onOpen={() => handleOpen(active.road.slug)}
                />
              </div>
            );
          })()}
        </div>
      </div>

      {focusedEntry && (
        <RoadFocused
          road={focusedEntry.road}
          distanceFromOrigin={focusedEntry.distance}
          originLabel={origin?.label ?? null}
          done={done.has(focusedEntry.road.slug)}
          onToggleDone={() => toggle(focusedEntry.road.slug)}
          onClose={handleCloseFocus}
        />
      )}
    </div>
  );
}

function TopBar({
  currentLocation,
  onRequestGeo,
  geoRequested,
  home,
  onSaveHome,
}: {
  currentLocation: LatLng | null;
  onRequestGeo: () => void;
  geoRequested: boolean;
  home: ReturnType<typeof useHomeLocation>["home"];
  onSaveHome: ReturnType<typeof useHomeLocation>["setHome"];
}) {
  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 backdrop-blur sm:px-5">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-[color:var(--accent)]">
            <path
              d="M3 20 L9 4 L13 14 L17 8 L21 20"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight text-[var(--text)]">
            Driver&rsquo;s Guide
          </div>
          <div className="hidden text-[10px] uppercase tracking-[0.16em] text-[var(--text-dim)] sm:block">
            Bay Area drives
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRequestGeo}
          disabled={geoRequested && !!currentLocation}
          className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] disabled:opacity-60 sm:inline-flex"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-[color:var(--accent)]">
            <path d="M10 2a6 6 0 0 0-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 0 0-6-6Zm0 8.25a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Z" />
          </svg>
          {currentLocation ? "Using GPS" : "Use GPS"}
        </button>
        <HomeLocationSetter home={home} onSave={onSaveHome} />
      </div>
    </header>
  );
}

function SubBar({
  sortBy,
  onSortChange,
  showDone,
  onShowDoneChange,
  doneCount,
  total,
  origin,
  geoError,
  onRequestGeo,
}: {
  sortBy: SortBy;
  onSortChange: (v: SortBy) => void;
  showDone: boolean;
  onShowDoneChange: (v: boolean) => void;
  doneCount: number;
  total: number;
  origin: { label: string } | null;
  geoError: string | null;
  onRequestGeo: () => void;
}) {
  return (
    <div className="relative z-10 flex shrink-0 flex-col gap-2 border-b border-[var(--border)] bg-[var(--bg)]/80 px-4 py-2.5 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-center gap-3">
        <LevelBadge count={doneCount} total={total} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <span className="uppercase tracking-[0.12em] text-[var(--text-dim)]">
            Sort
          </span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortBy)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="distance">Nearest</option>
            <option value="length">Longest</option>
            <option value="difficulty">Most demanding</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => onShowDoneChange(e.target.checked)}
            className="h-3.5 w-3.5 accent-[color:var(--accent)]"
          />
          Show driven
        </label>
        {!origin && (
          <button
            type="button"
            onClick={onRequestGeo}
            className="text-xs font-medium text-[color:var(--accent)] hover:underline"
            title={geoError ?? ""}
          >
            Set location to sort by distance
          </button>
        )}
      </div>
    </div>
  );
}
