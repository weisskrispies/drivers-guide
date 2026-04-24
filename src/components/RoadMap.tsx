"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map as MlMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Road, LatLng } from "@/lib/roads/types";

type Props = {
  roads: Road[];
  done: Set<string>;
  home: LatLng | null;
  currentLocation: LatLng | null;
  activeSlug: string | null;
  onSelect: (slug: string) => void;
};

// OpenFreeMap provides free, keyless vector tiles. Falls back to MapLibre
// demotiles if OpenFreeMap is unavailable in the browser.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const FALLBACK_STYLE = "https://demotiles.maplibre.org/style.json";

export default function RoadMap({
  roads,
  done,
  home,
  currentLocation,
  activeSlug,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  // init
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [-122.25, 37.6],
      zoom: 8,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("error", (e) => {
      const msg = (e as { error?: { message?: string } })?.error?.message ?? "";
      if (msg.includes("style") || msg.includes("sprite") || msg.includes("glyphs")) {
        try {
          map.setStyle(FALLBACK_STYLE);
        } catch {
          /* noop */
        }
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    roads.forEach((road) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", road.name);
      const isDone = done.has(road.slug);
      const isActive = activeSlug === road.slug;
      el.className = [
        "flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-lg transition-transform",
        isDone
          ? "bg-emerald-500 border-emerald-200 text-white"
          : "bg-white border-zinc-900 text-zinc-900 dark:bg-zinc-900 dark:border-white dark:text-white",
        isActive ? "scale-125 ring-2 ring-amber-400" : "hover:scale-110",
      ].join(" ");
      el.textContent = isDone ? "✓" : "";
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelect(road.slug);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([road.start.lng, road.start.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (home) {
      const el = document.createElement("div");
      el.className =
        "h-4 w-4 rounded-full bg-amber-400 border-2 border-amber-800 shadow";
      el.title = "Home";
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([home.lng, home.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    if (currentLocation) {
      const el = document.createElement("div");
      el.className =
        "h-3 w-3 rounded-full bg-blue-500 border-2 border-white shadow";
      el.title = "Your current location";
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([currentLocation.lng, currentLocation.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [roads, done, home, currentLocation, activeSlug, onSelect]);

  // fly to active
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeSlug) return;
    const road = roads.find((r) => r.slug === activeSlug);
    if (!road) return;
    map.flyTo({
      center: [road.start.lng, road.start.lat],
      zoom: 10.5,
      speed: 1.4,
    });
  }, [activeSlug, roads]);

  return <div ref={containerRef} className="h-full w-full" />;
}
