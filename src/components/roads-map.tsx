"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import maplibregl, {
  type LngLatBoundsLike,
  type Map as MapLibreMap,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Road } from "@/lib/roads/types";

const LINE_COLOR_DEFAULT = "#6b7280";
const LINE_COLOR_SELECTED = "#ef4444";

const STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster" as const,
      source: "osm",
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

type Props = {
  roads: Road[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function RoadsMap({ roads, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  useLayoutEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Initial mount: create the map.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const bounds = allBounds(roads);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [-98, 39],
      zoom: 3.2,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      map.addSource("roads", {
        type: "geojson",
        data: roadsFeatureCollection(roads, selectedId),
      });
      map.addLayer({
        id: "roads-line",
        type: "line",
        source: "roads",
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "selected"], 1],
            LINE_COLOR_SELECTED,
            LINE_COLOR_DEFAULT,
          ],
          "line-width": [
            "case",
            ["==", ["get", "selected"], 1],
            5,
            3,
          ],
          "line-opacity": 0.9,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      map.on("click", "roads-line", (e) => {
        const feature = e.features?.[0];
        const id = feature?.properties?.id;
        if (typeof id === "string") onSelectRef.current(id);
      });
      map.on("mouseenter", "roads-line", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "roads-line", () => {
        map.getCanvas().style.cursor = "";
      });

      for (const road of roads) {
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", road.name);
        el.className =
          "block h-3.5 w-3.5 rounded-full border-2 border-white bg-zinc-900 shadow-md transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-red-500";
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          onSelectRef.current(road.id);
        });
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([road.start_lng, road.start_lat])
          .addTo(map);
        markersRef.current.push(marker);
      }

      if (bounds) {
        map.fitBounds(bounds, { padding: 60, duration: 0 });
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // We intentionally only initialize once; subsequent updates use the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update line styling / source data when selection changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource("roads") as maplibregl.GeoJSONSource | undefined;
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
    const doFly = () => map.fitBounds(roadBounds(road), { padding: 100, duration: 900, maxZoom: 12 });
    if (map.isStyleLoaded()) doFly();
    else map.once("load", doFly);
  }, [roads, selectedId]);

  return <div ref={containerRef} className="h-full w-full" />;
}
