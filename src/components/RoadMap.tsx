"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import maplibregl, {
  type Map as MlMap,
  type Marker,
  type LngLatBoundsLike,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Road, LatLng } from "@/lib/roads/types";

type Props = {
  roads: Road[];
  done: Set<string>;
  home: LatLng | null;
  currentLocation: LatLng | null;
  activeSlug: string | null;
  onSelect: (slug: string) => void;
  onOpen?: (slug: string) => void;
};

const STYLE = {
  version: 8 as const,
  sources: {
    basemap: {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "basemap",
      type: "raster" as const,
      source: "basemap",
    },
  ],
};

function markerClass(state: { done: boolean; active: boolean }): string {
  return [
    "road-marker",
    "flex h-8 w-8 items-center justify-center rounded-full border-2",
    "text-[11px] font-semibold tabular-nums cursor-pointer",
    "shadow-[0_4px_14px_rgba(0,0,0,0.55)] transition-all duration-150",
    state.done
      ? "bg-[color:var(--accent)] border-[#0b0b0b] text-white"
      : "bg-[#0b0b0b] border-[color:var(--accent)] text-[color:var(--accent)]",
    state.active
      ? "scale-[1.25] z-10 ring-4 ring-[color:var(--accent-ring)]"
      : "hover:scale-110",
  ].join(" ");
}

function allBounds(roads: Road[]): LngLatBoundsLike | null {
  if (roads.length === 0) return null;
  const lngs = roads.flatMap((r) => [r.start.lng, r.end.lng]);
  const lats = roads.flatMap((r) => [r.start.lat, r.end.lat]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

export default function RoadMap({
  roads,
  done,
  home,
  currentLocation,
  activeSlug,
  onSelect,
  onOpen,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<
    Map<string, { marker: Marker; el: HTMLButtonElement }>
  >(new Map());
  const homeMarkerRef = useRef<Marker | null>(null);
  const gpsMarkerRef = useRef<Marker | null>(null);

  // Latest-value refs so marker click handlers created once can still read
  // the current active slug / callbacks without being rebound.
  const activeSlugRef = useRef<string | null>(activeSlug);
  const onSelectRef = useRef(onSelect);
  const onOpenRef = useRef(onOpen);
  const hasFitRef = useRef(false);
  useLayoutEffect(() => {
    activeSlugRef.current = activeSlug;
    onSelectRef.current = onSelect;
    onOpenRef.current = onOpen;
  }, [activeSlug, onSelect, onOpen]);

  // Initialize map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [-122.25, 37.6],
      zoom: 8.2,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    const markers = markersRef.current;
    return () => {
      markers.forEach(({ marker }) => marker.remove());
      markers.clear();
      homeMarkerRef.current?.remove();
      homeMarkerRef.current = null;
      gpsMarkerRef.current?.remove();
      gpsMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      hasFitRef.current = false;
    };
  }, []);

  // Reconcile road markers when the `roads` array changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const mount = () => {
      const existing = markersRef.current;
      const wanted = new Set(roads.map((r) => r.slug));

      existing.forEach((entry, slug) => {
        if (!wanted.has(slug)) {
          entry.marker.remove();
          existing.delete(slug);
        }
      });

      roads.forEach((road, index) => {
        if (existing.has(road.slug)) return;
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", road.name);
        el.textContent = String(index + 1);
        el.className = markerClass({ done: false, active: false });
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const slug = road.slug;
          if (slug === activeSlugRef.current) {
            onOpenRef.current?.(slug);
          } else {
            onSelectRef.current(slug);
          }
        });
        const marker = new maplibregl.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat([road.start.lng, road.start.lat])
          .addTo(map);
        existing.set(road.slug, { marker, el });
      });

      roads.forEach((road, index) => {
        const entry = existing.get(road.slug);
        if (entry) entry.el.textContent = String(index + 1);
      });

      if (!hasFitRef.current && roads.length > 0) {
        const bounds = allBounds(roads);
        if (bounds) map.fitBounds(bounds, { padding: 70, duration: 0 });
        hasFitRef.current = true;
      }
    };

    if (map.isStyleLoaded()) mount();
    else map.once("load", mount);
  }, [roads]);

  // Restyle markers in place when selection or completion state changes.
  useEffect(() => {
    markersRef.current.forEach((entry, slug) => {
      entry.el.className = markerClass({
        done: done.has(slug),
        active: slug === activeSlug,
      });
    });
  }, [done, activeSlug]);

  // Fly to the active road.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeSlug) return;
    const road = roads.find((r) => r.slug === activeSlug);
    if (!road) return;
    const doFly = () =>
      map.flyTo({
        center: [road.start.lng, road.start.lat],
        zoom: Math.max(map.getZoom(), 10.5),
        speed: 1.2,
      });
    if (map.isStyleLoaded()) doFly();
    else map.once("load", doFly);
  }, [activeSlug, roads]);

  // Home marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      homeMarkerRef.current?.remove();
      homeMarkerRef.current = null;
      if (!home) return;
      const el = document.createElement("div");
      el.className =
        "h-4 w-4 rounded-full bg-[color:var(--accent)] ring-2 ring-[#0b0b0b] shadow";
      el.title = "Home";
      homeMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([home.lng, home.lat])
        .addTo(map);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [home]);

  // GPS marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      gpsMarkerRef.current?.remove();
      gpsMarkerRef.current = null;
      if (!currentLocation) return;
      const el = document.createElement("div");
      el.className =
        "h-3 w-3 rounded-full bg-sky-400 ring-2 ring-[#0b0b0b] shadow";
      el.title = "Your current location";
      gpsMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([currentLocation.lng, currentLocation.lat])
        .addTo(map);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [currentLocation]);

  return <div ref={containerRef} className="h-full w-full" />;
}
