"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ROADS } from "@/lib/roads/data";
import type { LatLng } from "@/lib/roads/types";
import { haversineMiles } from "@/lib/geo";
import { useCompletions, useHomeLocation } from "@/lib/storage";
import HomeLocationSetter from "./HomeLocationSetter";
import LevelBadge from "./LevelBadge";
import RoadCard from "./RoadCard";

// maplibre-gl touches `window` on import, so keep the map client-only.
const RoadMap = dynamic(() => import("./RoadMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900">
      Loading map…
    </div>
  ),
});

type View = "list" | "map";
type SortBy = "distance" | "length" | "difficulty";

const DIFFICULTY_ORDER = { easy: 0, moderate: 1, spirited: 2, expert: 3 } as const;

export default function RoadsApp() {
  const { home, setHome } = useHomeLocation();
  const { done, toggle } = useCompletions();

  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoRequested, setGeoRequested] = useState(false);

  const [view, setView] = useState<View>("list");
  const [sortBy, setSortBy] = useState<SortBy>("distance");
  const [showDone, setShowDone] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const origin: { point: LatLng; label: string } | null = useMemo(() => {
    if (currentLocation) return { point: currentLocation, label: "you" };
    if (home) return { point: home, label: home.label };
    return null;
  }, [currentLocation, home]);

  const roadsWithDistance = useMemo(() => {
    return ROADS.map((road) => {
      const dist = origin
        ? haversineMiles(origin.point, { lat: road.start.lat, lng: road.start.lng })
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
          DIFFICULTY_ORDER[b.road.difficulty] - DIFFICULTY_ORDER[a.road.difficulty]
        );
      // distance — puts un-measurable roads at the bottom
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
    return sorted;
  }, [roadsWithDistance, sortBy, showDone, done]);

  function requestGeo() {
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
  }

  // Default the map panel to the nearest visible road if nothing is selected.
  const effectiveActiveSlug =
    activeSlug && visibleRoads.some((r) => r.road.slug === activeSlug)
      ? activeSlug
      : (visibleRoads[0]?.road.slug ?? null);

  const doneCount = done.size;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="text-2xl" aria-hidden>
              🛣️
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none text-zinc-900 dark:text-zinc-50">
                Driver&rsquo;s Guide
              </h1>
              <p className="text-[11px] text-zinc-500">
                Bay Area&rsquo;s best Sunday-morning roads
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={requestGeo}
              disabled={geoRequested && !!currentLocation}
              className="hidden rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 sm:block"
              title="Use my current location"
            >
              📍 {currentLocation ? "Using GPS" : "Use GPS"}
            </button>
            <HomeLocationSetter home={home} onSave={setHome} />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
        <LevelBadge count={doneCount} total={ROADS.length} />
      </section>

      <section className="mx-auto mt-4 w-full max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-full border border-zinc-300 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setView("list")}
              className={[
                "rounded-full px-3 py-1 text-sm font-medium",
                view === "list"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-700 dark:text-zinc-300",
              ].join(" ")}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView("map")}
              className={[
                "rounded-full px-3 py-1 text-sm font-medium",
                view === "map"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-700 dark:text-zinc-300",
              ].join(" ")}
            >
              Map
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              <span>Sort</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="distance">Nearest first</option>
                <option value="length">Longest first</option>
                <option value="difficulty">Most demanding</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={showDone}
                onChange={(e) => setShowDone(e.target.checked)}
                className="h-4 w-4"
              />
              <span>Show driven</span>
            </label>
          </div>
        </div>

        {!origin && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
            Set a home location or{" "}
            <button
              type="button"
              onClick={requestGeo}
              className="underline underline-offset-2"
            >
              enable GPS
            </button>{" "}
            to sort by distance from you.
            {geoError && <div className="mt-1 text-xs opacity-80">{geoError}</div>}
          </div>
        )}
      </section>

      <main className="mx-auto mt-4 w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">
        {view === "list" ? (
          <ul className="grid gap-3">
            {visibleRoads.map(({ road, distance }) => (
              <li key={road.slug}>
                <RoadCard
                  road={road}
                  distanceFromOrigin={distance}
                  originLabel={origin?.label ?? null}
                  done={done.has(road.slug)}
                  active={effectiveActiveSlug === road.slug}
                  onToggleDone={() => toggle(road.slug)}
                  onSelect={() =>
                    setActiveSlug((cur) => (cur === road.slug ? null : road.slug))
                  }
                />
              </li>
            ))}
            {visibleRoads.length === 0 && (
              <li className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
                You&rsquo;ve driven them all. Go submit new ones.
              </li>
            )}
          </ul>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[1fr_22rem]">
            <div className="h-[70vh] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <RoadMap
                roads={visibleRoads.map((r) => r.road)}
                done={done}
                home={home}
                currentLocation={currentLocation}
                activeSlug={effectiveActiveSlug}
                onSelect={setActiveSlug}
              />
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {(() => {
                const active =
                  visibleRoads.find((r) => r.road.slug === effectiveActiveSlug) ??
                  visibleRoads[0];
                if (!active)
                  return (
                    <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
                      No roads to show.
                    </div>
                  );
                return (
                  <RoadCard
                    road={active.road}
                    distanceFromOrigin={active.distance}
                    originLabel={origin?.label ?? null}
                    done={done.has(active.road.slug)}
                    active={true}
                    onToggleDone={() => toggle(active.road.slug)}
                    onSelect={() => setActiveSlug(active.road.slug)}
                  />
                );
              })()}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-200 bg-white py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
        <p>
          Routes curated from enthusiast forums. Drive within your limits and the
          posted speed — these roads are shared with cyclists, wildlife, and
          locals.
        </p>
        <p className="mt-1 opacity-70">
          Sign-in & cloud sync land in the next build. Your progress lives in this
          browser for now.
        </p>
      </footer>
    </div>
  );
}
