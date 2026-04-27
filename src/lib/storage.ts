"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { LatLng } from "./roads/types";
import { isDaylight, nextSunTransition } from "./sun";

const KEY_HOME = "driversguide.home";
const KEY_DONE = "driversguide.completions";
const KEY_THEME = "driversguide.theme";

export type HomeLocation = LatLng & { label: string };
export type Theme = "light" | "dark";
export type ThemePref = "light" | "dark" | "auto";

// Default location when the user hasn't shared GPS or set a home — used
// to compute a sensible sun position so "auto" theme works on first
// load.
const DEFAULT_LOCATION: LatLng = { lat: 37.7749, lng: -122.4194 };

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

function emit(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

function subscribe(key: string, cb: Listener): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(cb);

  // Also listen for cross-tab writes.
  const onStorage = (e: StorageEvent) => {
    if (e.key === key) cb();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    set!.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // private mode / quota — ignore
  }
  emit(key);
}

function useLocalStorageString(key: string): string | null {
  return useSyncExternalStore(
    useCallback((cb) => subscribe(key, cb), [key]),
    useCallback(() => readRaw(key), [key]),
    () => null, // server snapshot
  );
}

export function useHomeLocation() {
  const raw = useLocalStorageString(KEY_HOME);
  const home = parseJson<HomeLocation>(raw);
  const hydrated = typeof window !== "undefined";

  const setHome = useCallback((next: HomeLocation | null) => {
    writeRaw(KEY_HOME, next ? JSON.stringify(next) : null);
  }, []);

  return { home, setHome, hydrated };
}

export function useCompletions() {
  const raw = useLocalStorageString(KEY_DONE);
  const done = toSet(parseJson<string[]>(raw));
  const hydrated = typeof window !== "undefined";

  const toggle = useCallback((slug: string) => {
    const current = toSet(parseJson<string[]>(readRaw(KEY_DONE)));
    if (current.has(slug)) current.delete(slug);
    else current.add(slug);
    writeRaw(KEY_DONE, JSON.stringify(Array.from(current)));
  }, []);

  const reset = useCallback(() => {
    writeRaw(KEY_DONE, JSON.stringify([]));
  }, []);

  return { done, toggle, reset, hydrated };
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toSet(arr: string[] | null): Set<string> {
  return new Set(arr ?? []);
}

/**
 * Theme hook with three modes:
 *  - "light"  — explicit day theme
 *  - "dark"   — explicit night theme
 *  - "auto"   — follow the user's *local* sunrise/sunset (default)
 *
 * Pass the user's GPS fix or home location so "auto" can compute the
 * right transition. Falls back to a Bay Area default when neither is
 * available (e.g. on first load). The hook re-renders itself once at
 * each upcoming sunrise/sunset to flip the resolved theme.
 *
 * The on-disk value is the *preference* (light / dark / auto); the
 * `theme` returned is the *resolved* concrete theme to apply.
 */
export function useTheme(location?: LatLng | null) {
  const raw = useLocalStorageString(KEY_THEME);
  const pref: ThemePref =
    raw === "light" || raw === "dark" || raw === "auto"
      ? (raw as ThemePref)
      : "auto";

  // tick is bumped by a setTimeout we schedule for the next solar
  // transition; bumping it forces this hook to recompute the resolved
  // theme so the UI flips at sunrise/sunset.
  const [tick, setTick] = useState(0);

  const point = location ?? DEFAULT_LOCATION;

  let theme: Theme;
  if (pref === "light" || pref === "dark") {
    theme = pref;
  } else if (typeof window === "undefined") {
    // No window during static prerender — fall back to OS preference.
    theme = "light";
  } else {
    theme = isDaylight(new Date(), point.lat, point.lng) ? "light" : "dark";
  }

  // Schedule a re-render at the next sunrise / sunset when in auto mode.
  useEffect(() => {
    if (pref !== "auto") return;
    if (typeof window === "undefined") return;
    const next = nextSunTransition(new Date(), point.lat, point.lng);
    if (!next) return;
    const ms = Math.max(1000, next.getTime() - Date.now());
    const timer = window.setTimeout(() => setTick((t) => t + 1), ms);
    return () => window.clearTimeout(timer);
    // tick is included so we re-schedule after each transition
  }, [pref, point.lat, point.lng, tick]);

  const setThemePref = useCallback((next: ThemePref) => {
    writeRaw(KEY_THEME, next);
  }, []);

  // Cycle: auto → light → dark → auto.
  const toggle = useCallback(() => {
    const current = readRaw(KEY_THEME);
    const next: ThemePref =
      current === "auto"
        ? "light"
        : current === "light"
          ? "dark"
          : current === "dark"
            ? "auto"
            : "light";
    writeRaw(KEY_THEME, next);
  }, []);

  return { theme, themePref: pref, setThemePref, toggle };
}
