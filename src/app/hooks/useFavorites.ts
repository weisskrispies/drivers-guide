"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "concert-radar:favorites";

// A tiny localStorage-backed store for favorite bands, exposed via
// useSyncExternalStore. This keeps reads SSR-safe (server snapshot is empty,
// hydration matches, then the client swaps in the stored value) without
// calling setState inside an effect.

const EMPTY: string[] = [];
let favorites: string[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function readStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // ignore corrupt / unavailable storage
  }
  return EMPTY;
}

function writeStorage(next: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

function emit() {
  for (const l of listeners) l();
}

function setFavorites(next: string[]) {
  favorites = next;
  writeStorage(next);
  emit();
}

function subscribe(cb: () => void): () => void {
  if (!hydrated) {
    hydrated = true;
    favorites = readStorage();
  }
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      favorites = readStorage();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  // Notify in case hydration just changed the snapshot.
  queueMicrotask(cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): string[] {
  return favorites;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

/**
 * Favorite bands persisted to localStorage so filtering "only my bands" works
 * with zero backend. Also feeds the email-alert subscription form.
 */
export function useFavorites() {
  const favs = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const addFavorite = useCallback((band: string) => {
    const name = band.trim();
    if (!name) return;
    if (favorites.some((b) => b.toLowerCase() === name.toLowerCase())) return;
    setFavorites([...favorites, name]);
  }, []);

  const removeFavorite = useCallback((band: string) => {
    setFavorites(
      favorites.filter((b) => b.toLowerCase() !== band.toLowerCase()),
    );
  }, []);

  const isFavorite = useCallback(
    (band: string) => favs.some((b) => b.toLowerCase() === band.toLowerCase()),
    [favs],
  );

  const toggleFavorite = useCallback((band: string) => {
    const exists = favorites.some(
      (b) => b.toLowerCase() === band.toLowerCase(),
    );
    if (exists) {
      setFavorites(
        favorites.filter((b) => b.toLowerCase() !== band.toLowerCase()),
      );
    } else {
      const name = band.trim();
      if (name) setFavorites([...favorites, name]);
    }
  }, []);

  return {
    favorites: favs,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  };
}
