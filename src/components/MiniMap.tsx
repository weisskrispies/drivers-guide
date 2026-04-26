"use client";

import { useEffect, useRef } from "react";
import maplibregl, {
  type Map as MlMap,
  type Marker,
  type LngLatBoundsLike,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Road } from "@/lib/roads/types";
import type { Theme } from "@/lib/storage";

const ACCENT = "#fc5200";

function buildStyle(theme: Theme) {
  const isDark = theme === "dark";
  const base = isDark ? "dark_all" : "rastertiles/voyager";
  return {
    version: 8 as const,
    sources: {
      basemap: {
        type: "raster" as const,
        tiles: [
          `https://a.basemaps.cartocdn.com/${base}/{z}/{x}/{y}@2x.png`,
          `https://b.basemaps.cartocdn.com/${base}/{z}/{x}/{y}@2x.png`,
          `https://c.basemaps.cartocdn.com/${base}/{z}/{x}/{y}@2x.png`,
          `https://d.basemaps.cartocdn.com/${base}/{z}/{x}/{y}@2x.png`,
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap © CARTO",
        maxzoom: 19,
      },
    },
    layers: [{ id: "basemap", type: "raster" as const, source: "basemap" }],
  };
}

function pathBounds(path: [number, number][]): LngLatBoundsLike {
  const lngs = path.map(([lng]) => lng);
  const lats = path.map(([, lat]) => lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

type Props = {
  road: Road;
  theme: Theme;
};

export default function MiniMap({ road, theme }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(theme),
      bounds: pathBounds(road.path),
      fitBoundsOptions: {
        padding: { top: 28, right: 28, bottom: 28, left: 28 },
      },
      interactive: true,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;

    const addLayers = () => {
      if (!map.getSource("route")) {
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: road.path },
          },
        });
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route",
          paint: {
            "line-color": theme === "dark" ? "#000" : "#fff",
            "line-width": 8,
            "line-opacity": 0.85,
          },
          layout: { "line-cap": "round", "line-join": "round" },
        });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          paint: {
            "line-color": ACCENT,
            "line-width": 5,
            "line-opacity": 1,
          },
          layout: { "line-cap": "round", "line-join": "round" },
        });
      }

      // Start marker
      const el = document.createElement("div");
      el.className =
        "flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--accent)] text-[10px] font-semibold text-white border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.4)]";
      el.textContent = "S";
      markerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([road.start.lng, road.start.lat])
        .addTo(map);

      // End marker
      const el2 = document.createElement("div");
      el2.className =
        "flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-[color:var(--accent)] border-2 border-[color:var(--accent)] shadow-[0_2px_8px_rgba(0,0,0,0.4)]";
      el2.textContent = "E";
      new maplibregl.Marker({ element: el2, anchor: "center" })
        .setLngLat([road.end.lng, road.end.lat])
        .addTo(map);
    };

    if (map.isStyleLoaded()) addLayers();
    else map.once("load", addLayers);

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // We intentionally only init once per modal mount; theme is locked on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
