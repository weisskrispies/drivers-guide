"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ROADS } from "@/lib/roads/data";
import type { LatLng } from "@/lib/roads/types";
import { haversineMiles } from "@/lib/geo";
import { useCompletions, useHomeLocation, useTheme } from "@/lib/storage";
import ProfileMenu from "./ProfileMenu";
import RoadCard from "./RoadCard";
import RoadFocused from "./RoadFocused";
import ThemeToggle from "./ThemeToggle";

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
  const { theme } = useTheme();

  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortBy>("distance");
  const [showDone, setShowDone] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);
  // Counters bumped to ask the map for a one-shot fit / recenter. Using
  // tokens (instead of a boolean flag) means repeated requests for the
  // same target — even on the same activeSlug — still trigger the action.
  const [fitToken, setFitToken] = useState(0);
  const [recenterToken, setRecenterToken] = useState(0);

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

  // List/modal selection: selecting bumps the fit token so the map
  // re-frames to show the route (and the user's location, if known).
  const handleSelectAndFit = useCallback((slug: string) => {
    setActiveSlug(slug);
    setFitToken((t) => t + 1);
  }, []);

  // Map-originated selection: don't move the map, the user already sees
  // where they tapped.
  const handleSelectNoFit = useCallback((slug: string) => {
    setActiveSlug(slug);
  }, []);

  const handleOpen = useCallback((slug: string) => {
    setActiveSlug(slug);
    setFitToken((t) => t + 1);
    setFocusedSlug(slug);
  }, []);

  const handleCloseFocus = useCallback(() => setFocusedSlug(null), []);

  // Request a recenter on the user's GPS. Both the on-map locate button
  // and the popover "Use GPS" button call this; the map watches
  // recenterToken and reacts identically either way.
  const requestGeo = useCallback(() => {
    setRecenterToken((t) => t + 1);
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

  // Scroll the active road's list item into view whenever the selection
  // changes — including selections made by tapping the map.
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  useEffect(() => {
    if (!effectiveActiveSlug) return;
    const el = itemRefs.current.get(effectiveActiveSlug);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [effectiveActiveSlug]);

  return (
    <div className="flex h-[100svh] min-h-[100svh] flex-col">
      <header className="relative z-20 shrink-0 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
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
              <div className="text-[14px] font-semibold tracking-tight text-[var(--text)]">
                Driver&rsquo;s Guide
              </div>
              <div className="hidden text-[10px] uppercase tracking-[0.18em] text-[var(--text-dim)] sm:block">
                Bay Area drives
              </div>
            </div>
          </div>

          {/* Right: theme toggle + profile */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
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
          </div>
        </div>
      </header>

      {/* Mobile: full-bleed map + bottom sheet card */}
      <div className="relative flex min-h-0 flex-1 md:hidden">
        <main className="min-h-0 flex-1">
          <RoadMap
            roads={visibleRoads.map((r) => r.road)}
            done={done}
            home={home}
            currentLocation={currentLocation}
            activeSlug={effectiveActiveSlug}
            fitToken={fitToken}
            recenterToken={recenterToken}
            theme={theme}
            onSelect={handleSelectNoFit}
            onOpen={handleOpen}
            onRequestGeo={requestGeo}
          />
        </main>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
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
                  onSelect={() => handleSelectAndFit(active.road.slug)}
                  onOpen={() => handleOpen(active.road.slug)}
                />
              </div>
            );
          })()}
        </div>
      </div>

      {/* Tablet/desktop: spacious padded layout, rounded map, generous list */}
      <div className="hidden min-h-0 flex-1 md:block">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] gap-6 px-4 py-4 sm:px-6 sm:py-5 lg:gap-8 lg:px-8 lg:py-6">
          <main className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
            <RoadMap
              roads={visibleRoads.map((r) => r.road)}
              done={done}
              home={home}
              currentLocation={currentLocation}
              activeSlug={effectiveActiveSlug}
              fitToken={fitToken}
            recenterToken={recenterToken}
              theme={theme}
              onSelect={handleSelectNoFit}
              onOpen={handleOpen}
              onRequestGeo={requestGeo}
            />
          </main>

          <aside className="flex min-h-0 w-[400px] shrink-0 flex-col lg:w-[440px]">
            <div className="mb-3 flex items-baseline justify-between px-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {visibleRoads.length} route{visibleRoads.length === 1 ? "" : "s"}
              </h2>
              {origin && (
                <span className="text-[11px] text-[var(--text-dim)]">
                  from{" "}
                  <span className="text-[var(--text-muted)]">
                    {origin.label}
                  </span>
                </span>
              )}
            </div>
            <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-6 pr-1">
              {visibleRoads.length === 0 && (
                <li className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">
                  You&rsquo;ve driven them all. Go submit new ones.
                </li>
              )}
              {visibleRoads.map(({ road, distance }, index) => (
                <li
                  key={road.slug}
                  ref={(el) => {
                    if (el) itemRefs.current.set(road.slug, el);
                    else itemRefs.current.delete(road.slug);
                  }}
                >
                  <RoadCard
                    road={road}
                    index={index}
                    distanceFromOrigin={distance}
                    originLabel={origin?.label ?? null}
                    done={done.has(road.slug)}
                    active={effectiveActiveSlug === road.slug}
                    onSelect={() => handleSelectAndFit(road.slug)}
                    onOpen={() => handleOpen(road.slug)}
                  />
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>

      {focusedEntry && (
        <RoadFocused
          road={focusedEntry.road}
          distanceFromOrigin={focusedEntry.distance}
          originLabel={origin?.label ?? null}
          done={done.has(focusedEntry.road.slug)}
          theme={theme}
          onToggleDone={() => toggle(focusedEntry.road.slug)}
          onClose={handleCloseFocus}
        />
      )}
    </div>
  );
}
