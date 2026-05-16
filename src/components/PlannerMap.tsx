"use client";

import { useEffect, useRef } from "react";
import maplibregl, {
  type Map as MlMap,
  type GeoJSONSource,
  type Marker,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Theme } from "@/lib/storage";

const ACCENT = "#fc5200";

type Point = { lat: number; lng: number; label?: string };

type Props = {
  /** Ordered road waypoints to pin (in drive order). */
  waypoints: Point[];
  /** Each curated road's real geometry, drawn as a line. Connectors are
   *  intentionally NOT passed — they were inaccurate straight lines. */
  roadPaths: [number, number][][];
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

function dot(bg: string, text: string, label: string) {
  const el = document.createElement("div");
  el.className =
    "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ring-2 ring-white shadow-[0_2px_8px_rgba(0,0,0,0.4)]";
  el.style.background = bg;
  el.style.color = text;
  el.title = label;
  return el;
}

export default function PlannerMap({
  waypoints,
  roadPaths,
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
  const drawRef = useRef<() => void>(() => {});
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

  // Re-apply the basemap on theme change, then redraw everything once the
  // new style is ready (setStyle drops custom sources/layers/markers).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(buildStyle(theme));
    map.once("styledata", () => drawRef.current());
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      // Road geometry (real curated shapes; no connector lines).
      const fc = {
        type: "FeatureCollection" as const,
        features: roadPaths
          .filter((p) => p.length >= 2)
          .map((coords) => ({
            type: "Feature" as const,
            properties: {},
            geometry: { type: "LineString" as const, coordinates: coords },
          })),
      };
      const existing = map.getSource("plan-roads") as
        | GeoJSONSource
        | undefined;
      if (existing) {
        existing.setData(fc);
      } else {
        map.addSource("plan-roads", { type: "geojson", data: fc });
        map.addLayer({
          id: "plan-roads-casing",
          type: "line",
          source: "plan-roads",
          paint: {
            "line-color": theme === "dark" ? "#000000" : "#ffffff",
            "line-width": 7,
            "line-opacity": 0.8,
          },
          layout: { "line-cap": "round", "line-join": "round" },
        });
        map.addLayer({
          id: "plan-roads-line",
          type: "line",
          source: "plan-roads",
          paint: { "line-color": ACCENT, "line-width": 4 },
          layout: { "line-cap": "round", "line-join": "round" },
        });
      }

      // Markers.
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (start) {
        const el = dot(ACCENT, "#fff", start.label ?? "Start");
        el.innerHTML =
          '<svg viewBox="0 0 20 20" fill="currentColor" style="width:13px;height:13px"><path d="M10.707 2.293a1 1 0 0 0-1.414 0l-7 7A1 1 0 0 0 3 11h1v6a1 1 0 0 0 1 1h3v-4a2 2 0 1 1 4 0v4h3a1 1 0 0 0 1-1v-6h1a1 1 0 0 0 .707-1.707l-7-7Z"/></svg>';
        markersRef.current.push(
          new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([start.lng, start.lat])
            .setPopup(
              new maplibregl.Popup({ offset: 16 }).setText(
                start.label ?? "Start",
              ),
            )
            .addTo(map),
        );
      }

      waypoints.forEach((w, i) => {
        const el = dot(ACCENT, "#fff", w.label ?? `Waypoint ${i + 1}`);
        el.textContent = String(i + 1);
        markersRef.current.push(
          new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([w.lng, w.lat])
            .setPopup(
              new maplibregl.Popup({ offset: 16 }).setText(
                `${i + 1}. ${w.label ?? "Waypoint"}`,
              ),
            )
            .addTo(map),
        );
      });

      stops.forEach((s, i) => {
        const el = dot("#7c3aed", "#fff", s.label ?? `Stop ${i + 1}`);
        el.innerHTML =
          '<svg viewBox="0 0 20 20" fill="currentColor" style="width:12px;height:12px"><path d="M10 2a6 6 0 0 0-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 0 0-6-6Zm0 8.25a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Z"/></svg>';
        markersRef.current.push(
          new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([s.lng, s.lat])
            .setPopup(
              new maplibregl.Popup({ offset: 16 }).setText(
                s.label ?? `Stop ${i + 1}`,
              ),
            )
            .addTo(map),
        );
      });

      // Fit to road geometry + all markers.
      const pts: [number, number][] = [];
      for (const path of roadPaths) for (const c of path) pts.push(c);
      if (start) pts.push([start.lng, start.lat]);
      for (const w of waypoints) pts.push([w.lng, w.lat]);
      for (const s of stops) pts.push([s.lng, s.lat]);
      if (pts.length === 1) {
        map.easeTo({ center: pts[0], zoom: 11, duration: 500 });
      } else if (pts.length > 1) {
        const lngs = pts.map((p) => p[0]);
        const lats = pts.map((p) => p[1]);
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 70, maxZoom: 13, duration: 600 },
        );
      }
    };

    drawRef.current = draw;
    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);
  }, [roadPaths, waypoints, start, stops, theme]);

  return <div ref={containerRef} className="h-full w-full" />;
}
