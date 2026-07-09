"use client";

import type { Concert } from "@/lib/concerts/types";
import {
  formatConcertDate,
  formatConcertTime,
  formatPrice,
} from "@/lib/concerts/format";

interface Props {
  concert: Concert;
  matched: boolean;
  favoriteArtists: string[];
  onToggleFavorite: (band: string) => void;
  isFavorite: (band: string) => boolean;
}

export function ConcertCard({
  concert,
  matched,
  onToggleFavorite,
  isFavorite,
}: Props) {
  const time = formatConcertTime(concert);
  const price = formatPrice(concert);
  // The favoritable act for the quick-star is the primary artist (or title).
  const primary = concert.artists[0] ?? concert.title;
  const starred = isFavorite(primary);

  return (
    <article
      className={`group relative flex flex-col gap-3 rounded-xl border p-4 transition-colors ${
        matched
          ? "border-violet-400/60 bg-violet-50 dark:border-violet-500/40 dark:bg-violet-950/20"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {concert.url ? (
              <a
                href={concert.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {concert.title}
              </a>
            ) : (
              concert.title
            )}
          </h3>
          {concert.artists.length > 1 && (
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              with {concert.artists.slice(1).join(", ")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite(primary)}
          aria-pressed={starred}
          aria-label={
            starred
              ? `Remove ${primary} from favorites`
              : `Add ${primary} to favorites`
          }
          title={starred ? "Remove from favorites" : "Add to favorites"}
          className={`shrink-0 rounded-full p-1.5 text-lg leading-none transition-colors ${
            starred
              ? "text-amber-500 hover:text-amber-600"
              : "text-zinc-300 hover:text-amber-400 dark:text-zinc-600"
          }`}
        >
          {starred ? "★" : "☆"}
        </button>
      </div>

      <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-300">
        <dd className="font-medium text-zinc-900 dark:text-zinc-100">
          {formatConcertDate(concert)}
          {time ? ` · ${time}` : ""}
        </dd>
        {concert.venue && (
          <dd className="before:mr-3 before:text-zinc-300 before:content-['·'] dark:before:text-zinc-600">
            {concert.venue}
          </dd>
        )}
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {concert.city && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {concert.city}
            </span>
          )}
          {matched && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              ★ Your band
            </span>
          )}
        </div>
        {price && (
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {price}
          </span>
        )}
      </div>
    </article>
  );
}
