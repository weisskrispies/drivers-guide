"use client";

import { useMemo, useState } from "react";
import type { Concert } from "@/lib/concerts/types";
import {
  concertMatchesBands,
  normalizeName,
  normalizeMany,
} from "@/lib/concerts/normalize";
import { useFavorites } from "@/app/hooks/useFavorites";
import { ConcertCard } from "./ConcertCard";
import { FavoritesPanel } from "./FavoritesPanel";

interface Props {
  concerts: Concert[];
  cities: string[];
  usingFallback: boolean;
}

type WhenFilter = "all" | "week" | "month";

function withinDays(dateStr: string | null, days: number): boolean {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return date >= start && date <= end;
}

export function ConcertApp({ concerts, cities, usingFallback }: Props) {
  const { favorites, addFavorite, removeFavorite, toggleFavorite, isFavorite } =
    useFavorites();

  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const [when, setWhen] = useState<WhenFilter>("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const normalizedFavorites = useMemo(
    () => normalizeMany(favorites),
    [favorites],
  );

  // Precompute which concerts match the user's favorite bands.
  const matchedIds = useMemo(() => {
    const set = new Set<string>();
    if (normalizedFavorites.length === 0) return set;
    for (const c of concerts) {
      const bands = concertMatchesBands(
        c.artistsNormalized,
        normalizeName(c.title),
        normalizedFavorites,
      );
      if (bands.length) set.add(c.id);
    }
    return set;
  }, [concerts, normalizedFavorites]);

  const filtered = useMemo(() => {
    const q = normalizeName(query);
    return concerts.filter((c) => {
      if (onlyFavorites && !matchedIds.has(c.id)) return false;
      if (city !== "all" && c.city !== city) return false;
      if (when === "week" && !withinDays(c.eventDate, 7)) return false;
      if (when === "month" && !withinDays(c.eventDate, 31)) return false;
      if (q) {
        const hay = normalizeName(
          [c.title, c.venue ?? "", c.city ?? "", ...c.artists].join(" "),
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [concerts, query, city, when, onlyFavorites, matchedIds]);

  // Suggestions for the favorites panel: primary artists of upcoming shows.
  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of concerts) {
      const name = c.artists[0] ?? c.title;
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(name);
      }
    }
    return out;
  }, [concerts]);

  const matchedCount = matchedIds.size;

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* Sidebar */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <FavoritesPanel
          favorites={favorites}
          cities={cities}
          addFavorite={addFavorite}
          removeFavorite={removeFavorite}
          suggestions={suggestions}
        />
      </aside>

      {/* Main column */}
      <div className="flex flex-col gap-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bands, venues, cities…"
            aria-label="Search concerts"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label="Filter by city"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="all">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div
              className="inline-flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700"
              role="group"
              aria-label="Filter by date range"
            >
              {(
                [
                  ["all", "Anytime"],
                  ["week", "This week"],
                  ["month", "This month"],
                ] as [WhenFilter, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setWhen(value)}
                  aria-pressed={when === value}
                  className={`px-3 py-2 text-sm transition-colors ${
                    when === value
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label
              className={`ml-auto inline-flex cursor-pointer select-none items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                onlyFavorites
                  ? "border-violet-500 bg-violet-600 text-white"
                  : "border-zinc-300 text-zinc-600 hover:border-violet-400 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              <input
                type="checkbox"
                checked={onlyFavorites}
                onChange={(e) => setOnlyFavorites(e.target.checked)}
                className="sr-only"
              />
              ★ Only my bands
              {matchedCount > 0 && (
                <span
                  className={`rounded-full px-1.5 text-xs ${
                    onlyFavorites
                      ? "bg-white/20"
                      : "bg-zinc-100 dark:bg-zinc-800"
                  }`}
                >
                  {matchedCount}
                </span>
              )}
            </label>
          </div>
        </div>

        {/* Results */}
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filtered.length} {filtered.length === 1 ? "show" : "shows"}
            {onlyFavorites ? " matching your bands" : ""}
          </p>
        </div>

        {filtered.length === 0 ? (
          <EmptyState onlyFavorites={onlyFavorites} hasFavorites={favorites.length > 0} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((concert) => (
              <ConcertCard
                key={concert.id}
                concert={concert}
                matched={matchedIds.has(concert.id)}
                favoriteArtists={favorites}
                onToggleFavorite={toggleFavorite}
                isFavorite={isFavorite}
              />
            ))}
          </div>
        )}

        {usingFallback && (
          <p className="mt-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/20 dark:text-amber-300">
            Showing sample data. Configure Supabase + a scraper source (see
            README) to load live Bay Area listings.
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  onlyFavorites,
  hasFavorites,
}: {
  onlyFavorites: boolean;
  hasFavorites: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
        {onlyFavorites && !hasFavorites
          ? "Add some favorite bands to see their shows here."
          : "No shows match your filters."}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Try widening the date range or clearing the city filter.
      </p>
    </div>
  );
}
