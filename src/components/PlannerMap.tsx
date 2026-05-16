"use client";

import { useEffect, useRef } from "react";
import maplibregl, {
  type Map as MlMap,
  type GeoJSONSource,
  type Marker,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Theme } from "@/lib/storage";
import type { PlanSegment } from "@/lib/planner";

const ACCENT = "#fc5200";

type Point = { lat: number; lng: number; label?: string };

type Props = {
  segments: PlanSegment[];
  start: Point | null;
  stops: Point[];
  theme: Theme;
  onPick?: (p: { lat: number; lng: number }) => void;
};

function buildStyle(theme: Theme) {
  const base = theme === "dark" ? "dark_all" : "rastertiles/voyager";
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
        attribution:
          '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
        maxzoom: 19,
      },
    },
    layers: [{ id: "basemap", type: "raster" as const, source: "basemap" }],
  };
}

function collection(segments: PlanSegment[]) {
  return {
    type: "FeatureCollection" as const,
    features: segments
      .filter((s) => s.path.length >= 2)
      .map((s) => ({
        type: "Feature" as const,
        properties: { connector: s.kind === "road" ? 0 : 1 },
        geometry: {
          type: "LineString" as const,
          coordinates: s.path,
        },
      })),
  };
}

function addLayers(map: MlMap, theme: Theme) {
  map.addSource("plan", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addLayer({
    id: "plan-casing",
    type: "line",
    source: "plan",
    paint: {
      "line-color": theme === "dark" ? "#000000" : "#ffffff",
      "line-width": 8,
      "line-opacity": 0.7,
    },
    layout: { "line-cap": "round", "line-join": "round" },
  });
  map.addLayer({
    id: "plan-road",
    type: "line",
    source: "plan",
    filter: ["==", ["get", "connector"], 0],
    paint: { "line-color": ACCENT, "line-width": 5 },
    layout: { "line-cap": "round", "line-join": "round" },
  });
  map.addLayer({
    id: "plan-connector",
    type: "line",
    source: "plan",
    filter: ["==", ["get", "connector"], 1],
    paint: {
      "line-color": "#8b8782",
      "line-width": 3,
      "line-dasharray": [1.5, 1.5],
    },
    layout: { "line-cap": "round", "line-join": "round" },
  });
}

export default function PlannerMap({
  segments,
  start,
  stops,
  theme,
  onPick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const themeRef = useRef<Theme>(theme);
  const onPickRef = useRef(onPick);
  useEffect(() => {
    themeRef.current = theme;
    onPickRef.current = onPick;
  }, [theme, onPick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(themeRef.current),
      center: [-122.25, 37.7],
      zoom: 8,
      attributionControl: { compact: true },
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    map.on("click", (e) => {
      onPickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Theme swap.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(buildStyle(theme));
    map.once("styledata", () => {
      if (!map.getSource("plan")) addLayers(map, theme);
      const src = map.getSource("plan") as GeoJSONSource | undefined;
      src?.setData(collection(segments));
    });
  }, [theme, segments]);

  // Data + markers + fit.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const render = () => {
      if (!map.getSource("plan")) addLayers(map, themeRef.current);
      const src = map.getSource("plan") as GeoJSONSource | undefined;
      src?.setData(collection(segments));

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (start) {
        const el = document.createElement("div");
        el.className =
          "flex h-6 w-6 items-center justify-center rounded-full text-white ring-2 ring-white shadow-[0_2px_8px_rgba(0,0,0,0.4)]";
        el.style.background = ACCENT;
        el.title = start.label ?? "Start";
        el.innerHTML =
          '<svg viewBox="0 0 20 20" fill="currentColor" style="width:12px;height:12px"><path d="M10.707 2.293a1 1 0 0 0-1.414 0l-7 7A1 1 0 0 0 3 11h1v6a1 1 0 0 0 1 1h3v-4a2 2 0 1 1 4 0v4h3a1 1 0 0 0 1-1v-6h1a1 1 0 0 0 .707-1.707l-7-7Z"/></svg>';
        markersRef.current.push(
          new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([start.lng, start.lat])
            .addTo(map),
        );
      }
      stops.forEach((s, i) => {
        const el = document.createElement("div");
        el.className =
          "flex h-6 w-6 items-center justify-center rounded-full bg-[#7c3aed] text-[11px] font-semibold text-white ring-2 ring-white shadow-[0_2px_8px_rgba(0,0,0,0.4)]";
        el.textContent = String(i + 1);
        el.title = s.label ?? `Stop ${i + 1}`;
        markersRef.current.push(
          new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([s.lng, s.lat])
            .addTo(map),
        );
      });

      const pts: [number, number][] = [];
      for (const s of segments) for (const c of s.path) pts.push(c);
      if (start) pts.push([start.lng, start.lat]);
      for (const s of stops) pts.push([s.lng, s.lat]);
      if (pts.length > 0) {
        const lngs = pts.map((p) => p[0]);
        const lats = pts.map((p) => p[1]);
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 60, maxZoom: 13, duration: 600 },
        );
      }
    };

    if (map.isStyleLoaded()) render();
    else map.once("load", render);
  }, [segments, start, stops]);

  return <div ref={containerRef} className="h-full w-full" />;
}
