"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ROADS } from "@/lib/roads/data";
import type { LatLng } from "@/lib/roads/types";
import { haversineMiles } from "@/lib/geo";
import { useCompletions, useHomeLocation } from "@/lib/storage";
import ProfileMenu from "./ProfileMenu";
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
  const { done, toggle, reset } = useCompletions();

  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortBy>("distance");
  const [showDone, setShowDone] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);
  // Toggled true whenever selection originates from the list / modal so the
  // map fits to the chosen road; reset to false after the fit runs once.
  const [fitPending, setFitPending] = useState(false);

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

  const effectiveActiveSlug = useMemo(() => {
    if (activeSlug && visibleRoads.some((r) => r.road.slug === activeSlug)) {
      return activeSlug;
    }
    return visibleRoads[0]?.road.slug ?? null;
  }, [activeSlug, visibleRoads]);

  // From list/modal: should fit the map to the road.
  const handleSelectAndFit = useCallback((slug: string) => {
    setActiveSlug(slug);
    setFitPending(true);
  }, []);

  // From map: user already sees the road, don't re-pan under their finger.
  const handleSelectNoFit = useCallback((slug: string) => {
    setActiveSlug(slug);
    setFitPending(false);
  }, []);

  const handleOpen = useCallback((slug: string) => {
    setActiveSlug(slug);
    setFitPending(true);
    setFocusedSlug(slug);
  }, []);

  const handleCloseFocus = useCallback(() => setFocusedSlug(null), []);

  const requestGeo = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocation not available in this browser.");
      return;
    }
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
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 backdrop-blur sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4 text-[color:var(--accent)]"
            >
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
        <ProfileMenu
          doneCount={doneCount}
          total={ROADS.length}
          home={home}
          onSaveHome={setHome}
          onRequestGeo={requestGeo}
          usingGps={!!currentLocation}
          geoError={geoError}
          sortBy={sortBy}
          onSortChange={setSortBy}
          showDone={showDone}
          onShowDoneChange={setShowDone}
          onResetProgress={reset}
        />
      </header>

      <div className="relative flex min-h-0 flex-1">
        <main className="min-h-0 flex-1">
          <RoadMap
            roads={visibleRoads.map((r) => r.road)}
            done={done}
            home={home}
            currentLocation={currentLocation}
            activeSlug={effectiveActiveSlug}
            fitToActive={fitPending}
            onSelect={handleSelectNoFit}
            onOpen={handleOpen}
          />
        </main>

        <aside className="hidden min-h-0 w-[380px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface)]/70 backdrop-blur md:flex">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {visibleRoads.length} road{visibleRoads.length === 1 ? "" : "s"}
            </h2>
            {origin && (
              <span className="text-[11px] text-[var(--text-dim)]">
                from{" "}
                <span className="text-[var(--text-muted)]">{origin.label}</span>
              </span>
            )}
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
                  onSelect={() => handleSelectAndFit(road.slug)}
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
                  onSelect={() => handleSelectAndFit(active.road.slug)}
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
