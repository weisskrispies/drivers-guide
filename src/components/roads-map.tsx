"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import maplibregl, {
  type LngLatBoundsLike,
  type Map as MapLibreMap,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Road } from "@/lib/roads/types";

const ACCENT = "#dc2626";
const LINE_DEFAULT = "#18181b";

const STYLE = {
  version: 8 as const,
  sources: {
    basemap: {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
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
      paint: {
        "raster-saturation": -0.25,
      },
    },
  ],
};

function roadsFeatureCollection(roads: Road[], selectedId: string | null) {
  return {
    type: "FeatureCollection" as const,
    features: roads.map((road) => ({
      type: "Feature" as const,
      properties: {
        id: road.id,
        selected: road.id === selectedId ? 1 : 0,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: road.path,
      },
    })),
  };
}

function roadBounds(road: Road): LngLatBoundsLike {
  const lngs = road.path.map(([lng]) => lng);
  const lats = road.path.map(([, lat]) => lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

function allBounds(roads: Road[]): LngLatBoundsLike | null {
  if (roads.length === 0) return null;
  const lngs = roads.flatMap((r) => r.path.map(([lng]) => lng));
  const lats = roads.flatMap((r) => r.path.map(([, lat]) => lat));
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

function createMarkerEl(index: number, selected: boolean): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = [
    "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold",
    "border-2 shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    selected
      ? "bg-red-600 text-white border-white scale-110 z-10"
      : "bg-white text-zinc-900 border-white hover:scale-110",
  ].join(" ");
  el.textContent = String(index + 1);
  return el;
}

type Props = {
  roads: Road[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function RoadsMap({ roads, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  useLayoutEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [-98, 39],
      zoom: 3.4,
      attributionControl: { compact: true },
      cooperativeGestures: false,
    });
    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    map.on("load", () => {
      map.addSource("roads", {
        type: "geojson",
        data: roadsFeatureCollection(roads, selectedId),
      });

      map.addLayer({
        id: "roads-line-casing",
        type: "line",
        source: "roads",
        paint: {
          "line-color": "#ffffff",
          "line-width": [
            "case",
            ["==", ["get", "selected"], 1],
            8,
            5,
          ],
          "line-opacity": 0.9,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      map.addLayer({
        id: "roads-line",
        type: "line",
        source: "roads",
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "selected"], 1],
            ACCENT,
            LINE_DEFAULT,
          ],
          "line-width": [
            "case",
            ["==", ["get", "selected"], 1],
            4.5,
            2.5,
          ],
          "line-opacity": [
            "case",
            ["==", ["get", "selected"], 1],
            1,
            0.55,
          ],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      map.on("click", "roads-line", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (typeof id === "string") onSelectRef.current(id);
      });
      map.on("mouseenter", "roads-line", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "roads-line", () => {
        map.getCanvas().style.cursor = "";
      });

      const bounds = allBounds(roads);
      if (bounds) map.fitBounds(bounds, { padding: 80, duration: 0 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild markers whenever roads or selection changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;

    const build = () => {
      markers.forEach((m) => m.remove());
      markers.clear();

      roads.forEach((road, index) => {
        const el = createMarkerEl(index, road.id === selectedId);
        el.setAttribute("aria-label", road.name);
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          onSelectRef.current(road.id);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([road.start_lng, road.start_lat])
          .addTo(map);
        markers.set(road.id, marker);
      });
    };

    if (map.isStyleLoaded()) build();
    else map.once("load", build);

    return () => {
      markers.forEach((m) => m.remove());
      markers.clear();
    };
  }, [roads, selectedId]);

  // Keep line source in sync with selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource("roads") as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!source) return;
      source.setData(roadsFeatureCollection(roads, selectedId));
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [roads, selectedId]);

  // Fly to the selected road.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const road = roads.find((r) => r.id === selectedId);
    if (!road) return;
    const doFly = () =>
      map.fitBounds(roadBounds(road), {
        padding: { top: 120, right: 80, bottom: 120, left: 80 },
        duration: 900,
        maxZoom: 11.5,
      });
    if (map.isStyleLoaded()) doFly();
    else map.once("load", doFly);
  }, [roads, selectedId]);

  return <div ref={containerRef} className="h-full w-full bg-[#f4f2ee]" />;
}
