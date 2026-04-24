"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { LatLng } from "./roads/types";

const KEY_HOME = "driversguide.home";
const KEY_DONE = "driversguide.completions";

export type HomeLocation = LatLng & { label: string };

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
