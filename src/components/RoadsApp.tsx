"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ROADS } from "@/lib/roads/data";
import type { LatLng } from "@/lib/roads/types";
import { haversineMiles } from "@/lib/geo";
import { useCompletions, useHomeLocation, useTheme } from "@/lib/storage";
import ProfileMenu from "./ProfileMenu";
import RoadCard from "./RoadCard";
import MobileCardCarousel from "./MobileCardCarousel";
import IntroSection from "./IntroSection";
import RoadFocused from "./RoadFocused";
import ThemeToggle from "./ThemeToggle";
import DrivePlanner from "./DrivePlanner";
import type { MapHandle } from "./RoadMap";

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

  // The "auto" theme follows the user's local sunrise/sunset. Prefer the
  // GPS fix; fall back to home; finally to the default location inside
  // useTheme.
  const themeLocation = currentLocation ?? home ?? null;
  const { theme } = useTheme(themeLocation);

  const [mode, setMode] = useState<"explore" | "plan">("explore");
  const [sortBy, setSortBy] = useState<SortBy>("distance");
  const [showDone, setShowDone] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  // Intro panel is opt-in: default closed, opens via the info button
  // next to the wordmark.
  const [introOpen, setIntroOpen] = useState(false);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);
  // Imperative handle into the map. Click handlers call mapRef.current
  // directly, no state propagation through useEffect.
  const mapRef = useRef<MapHandle | null>(null);

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

  // List/modal selection: select the road and immediately ask the map
  // to fit to it. The slug is passed straight into the imperative call
  // — no ref dance, no microtask, no race with React's commit phase.
  const handleSelectAndFit = useCallback((slug: string) => {
    setActiveSlug(slug);
    mapRef.current?.fitTo(slug);
  }, []);

  // Map-originated selection: don't move the map, the user already sees
  // where they tapped.
  const handleSelectNoFit = useCallback((slug: string) => {
    setActiveSlug(slug);
  }, []);

  const handleOpen = useCallback((slug: string) => {
    setActiveSlug(slug);
    mapRef.current?.fitTo(slug);
    setFocusedSlug(slug);
  }, []);

  const handleCloseFocus = useCallback(() => setFocusedSlug(null), []);

  // Recenter request: fire the imperative recenter (instant fly to
  // cached fix + flag a re-fly when the fresh fix arrives), then start
  // the geolocation request.
  const requestGeo = useCallback(() => {
    mapRef.current?.recenter();
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
          {/* Brand — H1 lives here for SEO */}
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
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
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-[var(--text)]">
                Driver&rsquo;s Guide
                {/* Keep the SEO-keyword phrase in the H1 for crawlers
                    while keeping the visible wordmark short. */}
                <span className="sr-only">
                  {" "}— Bay Area driving roads, scenic drives near San
                  Francisco
                </span>
              </h1>
              <div className="hidden text-[10px] uppercase tracking-[0.18em] text-[var(--text-dim)] sm:block">
                Bay Area driving roads
              </div>
            </div>
            {/* Info button toggles the about/intro panel */}
            <button
              type="button"
              onClick={() => setIntroOpen((v) => !v)}
              aria-label="About this guide"
              aria-expanded={introOpen}
              className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[color:var(--accent)]"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 0 1-1.5 0v-.5a.75.75 0 0 1 1.5 0v.5Zm0 8a.75.75 0 0 1-1.5 0v-5a.75.75 0 0 1 1.5 0v5Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Right: mode toggle + theme + profile */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5 text-[12px] font-medium">
              {(["explore", "plan"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={`rounded-full px-3 py-1 transition-colors ${
                    mode === m
                      ? "bg-[color:var(--accent)] text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {m === "explore" ? "Explore" : "Plan a drive"}
                </button>
              ))}
            </div>
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

      <IntroSection
        totalRoutes={ROADS.length}
        open={introOpen}
        onClose={() => setIntroOpen(false)}
      />

      {mode === "plan" ? (
        <DrivePlanner
          roads={ROADS}
          home={home}
          currentLocation={currentLocation}
          onRequestGeo={requestGeo}
          theme={theme}
        />
      ) : (
        <>
      {/* One RoadMap, two layouts via CSS:
          - Mobile: map fills the viewport, list collapses to a bottom-sheet
            card overlaid on the map
          - md+: padded container, rounded map on the left, scrollable list
            on the right */}
      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col md:max-w-[1600px] md:flex-row md:gap-6 md:px-4 md:py-4 lg:gap-8 lg:px-8 lg:py-6">
        <main className="relative min-h-0 flex-1 overflow-hidden md:rounded-3xl md:border md:border-[var(--border)] md:bg-[var(--surface)] md:shadow-[var(--shadow-card)]">
          <RoadMap
            roads={visibleRoads.map((r) => r.road)}
            done={done}
            home={home}
            currentLocation={currentLocation}
            activeSlug={effectiveActiveSlug}
            handleRef={mapRef}
            theme={theme}
            onSelect={handleSelectNoFit}
            onOpen={handleOpen}
            onRequestGeo={requestGeo}
          />

          {/* Mobile-only swipeable carousel of compact road cards.
              Whatever's centered becomes the active road and re-fits
              the map; tap a card to open the full-detail modal. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 pt-3 md:hidden">
            <MobileCardCarousel
              entries={visibleRoads}
              activeSlug={effectiveActiveSlug}
              done={done}
              originLabel={origin?.label ?? null}
              onSelect={handleSelectAndFit}
              onOpen={handleOpen}
            />
          </div>
        </main>

        <aside className="hidden min-h-0 w-[400px] shrink-0 flex-col md:flex lg:w-[440px]">
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
        </>
      )}
    </div>
  );
}
