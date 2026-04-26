"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import maplibregl, {
  type Map as MlMap,
  type Marker,
  type LngLatBoundsLike,
  type GeoJSONSource,
  type IControl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Road, LatLng } from "@/lib/roads/types";
import type { Theme } from "@/lib/storage";

type Props = {
  roads: Road[];
  done: Set<string>;
  home: LatLng | null;
  currentLocation: LatLng | null;
  activeSlug: string | null;
  fitToActive: boolean;
  theme: Theme;
  onSelect: (slug: string) => void;
  onOpen?: (slug: string) => void;
  onRequestGeo: () => void;
};

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
        attribution:
          '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
        maxzoom: 19,
      },
    },
    layers: [
      { id: "basemap", type: "raster" as const, source: "basemap" },
    ],
  };
}

function lineCasing(theme: Theme) {
  return theme === "dark" ? "#000000" : "#ffffff";
}

function routeFeatures(
  roads: Road[],
  activeSlug: string | null,
  done: Set<string>,
) {
  return {
    type: "FeatureCollection" as const,
    features: roads.map((road) => ({
      type: "Feature" as const,
      properties: {
        slug: road.slug,
        active: road.slug === activeSlug ? 1 : 0,
        done: done.has(road.slug) ? 1 : 0,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: road.path,
      },
    })),
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

function allBounds(roads: Road[]): LngLatBoundsLike | null {
  if (roads.length === 0) return null;
  const lngs = roads.flatMap((r) => r.path.map(([lng]) => lng));
  const lats = roads.flatMap((r) => r.path.map(([, lat]) => lat));
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

// Static class string applied once when the marker DOM is created. State
// changes (active / done) are driven by data-* attributes + CSS rules in
// globals.css so we don't have to overwrite element.className later — that
// would wipe the maplibregl-marker classes and cause the marker to lose
// its absolute positioning.
const MARKER_BASE_CLASS =
  "road-marker flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-semibold tabular-nums cursor-pointer shadow-[0_3px_10px_rgba(0,0,0,0.35)]";

function applyMarkerState(
  el: HTMLElement,
  state: { done: boolean; active: boolean },
) {
  el.dataset.done = state.done ? "true" : "false";
  el.dataset.active = state.active ? "true" : "false";
}

class LocateControl implements IControl {
  private _container: HTMLDivElement | null = null;
  private _button: HTMLButtonElement | null = null;
  constructor(private readonly onClick: () => void) {}
  onAdd(): HTMLElement {
    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "Center on my location");
    button.title = "Center on my location";
    button.className = "locate-btn";
    button.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/></svg>';
    button.addEventListener("click", this.onClick);
    container.appendChild(button);
    this._container = container;
    this._button = button;
    return container;
  }
  onRemove(): void {
    if (this._button) this._button.removeEventListener("click", this.onClick);
    this._container?.parentNode?.removeChild(this._container);
  }
}

export default function RoadMap({
  roads,
  done,
  home,
  currentLocation,
  activeSlug,
  fitToActive,
  theme,
  onSelect,
  onOpen,
  onRequestGeo,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<
    Map<string, { marker: Marker; el: HTMLButtonElement }>
  >(new Map());
  const homeMarkerRef = useRef<Marker | null>(null);
  const gpsMarkerRef = useRef<Marker | null>(null);

  const activeSlugRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  const onOpenRef = useRef(onOpen);
  const onRequestGeoRef = useRef(onRequestGeo);
  const currentLocationRef = useRef<LatLng | null>(null);
  const themeRef = useRef<Theme>(theme);
  const hasFitRef = useRef(false);
  const skipNextFitForRef = useRef<string | null>(null);
  // Set by the on-map locate button; cleared after the next GPS fix is
  // applied. Lets the auto-fly effect recenter on every locate click, not
  // just the first fix.
  const pendingRecenterRef = useRef(false);
  useLayoutEffect(() => {
    activeSlugRef.current = activeSlug;
    onSelectRef.current = onSelect;
    onOpenRef.current = onOpen;
    onRequestGeoRef.current = onRequestGeo;
    currentLocationRef.current = currentLocation;
    themeRef.current = theme;
  }, [activeSlug, onSelect, onOpen, onRequestGeo, currentLocation, theme]);

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(themeRef.current),
      center: [-122.25, 37.6],
      zoom: 8.2,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    map.addControl(
      new LocateControl(() => {
        // Always ask for a fresh fix so we recenter on the user's current
        // position, not a stale one. If we already have a fix, fly to it
        // immediately for instant feedback while the new fix is on its way.
        const loc = currentLocationRef.current;
        if (loc) {
          map.flyTo({ center: [loc.lng, loc.lat], zoom: 13, speed: 1.4 });
        }
        pendingRecenterRef.current = true;
        onRequestGeoRef.current();
      }),
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

  // Swap basemap when the theme changes — re-add our layers afterwards.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(buildStyle(theme));
    // Re-add routes once the new style is loaded; markers remain in place.
    const apply = () => {
      if (!map.getSource("routes")) {
        addRoutesLayers(map, theme, {
          onSelect: (slug) => onSelectRef.current(slug),
          onOpen: (slug) => onOpenRef.current?.(slug),
          getActiveSlug: () => activeSlugRef.current,
          markSkipFit: (slug) => {
            skipNextFitForRef.current = slug;
          },
        });
      }
      const src = map.getSource("routes") as GeoJSONSource | undefined;
      if (src) src.setData(routeFeatures(roads, activeSlugRef.current, done));
      // Make sure layer paint reflects the theme casing color.
      if (map.getLayer("routes-casing")) {
        map.setPaintProperty("routes-casing", "line-color", lineCasing(theme));
      }
    };
    map.once("styledata", apply);
  }, [theme, roads, done]);

  // Fly to GPS fix when one arrives — on the very first fix, and any time
  // the locate button is pressed (which sets pendingRecenterRef).
  const gotFirstGpsRef = useRef(false);
  useEffect(() => {
    if (!currentLocation) {
      gotFirstGpsRef.current = false;
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    const isFirst = !gotFirstGpsRef.current;
    const recenterRequested = pendingRecenterRef.current;
    if (!isFirst && !recenterRequested) return;
    gotFirstGpsRef.current = true;
    pendingRecenterRef.current = false;
    const doFly = () =>
      map.flyTo({
        center: [currentLocation.lng, currentLocation.lat],
        zoom: Math.max(map.getZoom(), 12),
        speed: 1.2,
      });
    if (map.isStyleLoaded()) doFly();
    else map.once("load", doFly);
  }, [currentLocation]);

  // Routes source + layers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const ensure = () => {
      if (!map.getSource("routes")) {
        addRoutesLayers(map, themeRef.current, {
          onSelect: (slug) => onSelectRef.current(slug),
          onOpen: (slug) => onOpenRef.current?.(slug),
          getActiveSlug: () => activeSlugRef.current,
          markSkipFit: (slug) => {
            skipNextFitForRef.current = slug;
          },
        });
      }
      const src = map.getSource("routes") as GeoJSONSource | undefined;
      if (src) src.setData(routeFeatures(roads, activeSlug, done));
    };

    if (map.isStyleLoaded()) ensure();
    else map.once("load", ensure);
  }, [roads, done, activeSlug]);

  // Marker reconciliation — keyed by slug, never recreated unless slug set
  // changes.
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
        el.className = MARKER_BASE_CLASS;
        // Initial state; the dedicated restyle effect picks up `done` and
        // active changes immediately after mount.
        applyMarkerState(el, { done: false, active: false });
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const slug = road.slug;
          skipNextFitForRef.current = slug;
          if (slug === activeSlugRef.current) onOpenRef.current?.(slug);
          else onSelectRef.current(slug);
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

  // Restyle markers in place using data-* attributes so we don't clobber
  // the maplibregl-marker class on the element.
  useEffect(() => {
    markersRef.current.forEach((entry, slug) => {
      applyMarkerState(entry.el, {
        done: done.has(slug),
        active: slug === activeSlug,
      });
    });
  }, [done, activeSlug]);

  // Fit to active path on list/modal selection.
  useEffect(() => {
    if (!fitToActive) return;
    if (!activeSlug) return;
    if (skipNextFitForRef.current === activeSlug) {
      skipNextFitForRef.current = null;
      return;
    }
    const map = mapRef.current;
    if (!map) return;
    const road = roads.find((r) => r.slug === activeSlug);
    if (!road || road.path.length === 0) return;
    const doFit = () => {
      map.fitBounds(pathBounds(road.path), {
        padding: { top: 80, right: 80, bottom: 80, left: 80 },
        duration: 700,
        maxZoom: 12.5,
      });
    };
    if (map.isStyleLoaded()) doFit();
    else map.once("load", doFit);
  }, [activeSlug, roads, fitToActive]);

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
        "flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--accent)] text-white ring-2 ring-white shadow-[0_2px_8px_rgba(0,0,0,0.4)]";
      el.title = "Home";
      el.innerHTML =
        '<svg viewBox="0 0 20 20" fill="currentColor" style="width:10px;height:10px"><path d="M10.707 2.293a1 1 0 0 0-1.414 0l-7 7A1 1 0 0 0 3 11h1v6a1 1 0 0 0 1 1h3v-4a2 2 0 1 1 4 0v4h3a1 1 0 0 0 1-1v-6h1a1 1 0 0 0 .707-1.707l-7-7Z"/></svg>';
      homeMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([home.lng, home.lat])
        .addTo(map);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [home]);

  // GPS marker — pulse ring.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      gpsMarkerRef.current?.remove();
      gpsMarkerRef.current = null;
      if (!currentLocation) return;
      const el = document.createElement("div");
      el.className = "gps-marker relative";
      el.innerHTML = `
        <span class="block h-4 w-4 rounded-full bg-sky-500 ring-2 ring-white shadow-[0_2px_8px_rgba(0,0,0,0.4)]"></span>
        <span class="pointer-events-none absolute inset-0 rounded-full bg-sky-500/30 animate-ping"></span>
      `;
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

type RouteHandlers = {
  onSelect: (slug: string) => void;
  onOpen?: (slug: string) => void;
  getActiveSlug: () => string | null;
  markSkipFit: (slug: string) => void;
};

function addRoutesLayers(map: MlMap, theme: Theme, handlers: RouteHandlers) {
  map.addSource("routes", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addLayer({
    id: "routes-casing",
    type: "line",
    source: "routes",
    paint: {
      "line-color": lineCasing(theme),
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6, ["case", ["==", ["get", "active"], 1], 5, 3],
        12, ["case", ["==", ["get", "active"], 1], 11, 7],
      ],
      "line-opacity": 0.85,
    },
    layout: { "line-cap": "round", "line-join": "round" },
  });

  map.addLayer({
    id: "routes-line",
    type: "line",
    source: "routes",
    paint: {
      "line-color": ACCENT,
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6, ["case", ["==", ["get", "active"], 1], 3, 1.5],
        12, ["case", ["==", ["get", "active"], 1], 7, 3.5],
      ],
      "line-opacity": [
        "case",
        ["==", ["get", "active"], 1],
        1,
        0.75,
      ],
    },
    layout: { "line-cap": "round", "line-join": "round" },
  });

  map.on("click", "routes-line", (e) => {
    const slug = e.features?.[0]?.properties?.slug;
    if (typeof slug !== "string") return;
    handlers.markSkipFit(slug);
    if (slug === handlers.getActiveSlug()) handlers.onOpen?.(slug);
    else handlers.onSelect(slug);
  });
  map.on("mouseenter", "routes-line", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "routes-line", () => {
    map.getCanvas().style.cursor = "";
  });
}
