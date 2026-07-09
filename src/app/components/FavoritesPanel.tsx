"use client";

import { useState, useTransition } from "react";
import { saveSubscription } from "@/app/actions";

interface Props {
  favorites: string[];
  cities: string[];
  addFavorite: (band: string) => void;
  removeFavorite: (band: string) => void;
  suggestions: string[];
}

export function FavoritesPanel({
  favorites,
  cities,
  addFavorite,
  removeFavorite,
  suggestions,
}: Props) {
  const [input, setInput] = useState("");
  const [email, setEmail] = useState("");
  const [alertCities, setAlertCities] = useState<string[]>([]);
  const [status, setStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const unusedSuggestions = suggestions
    .filter((s) => !favorites.some((f) => f.toLowerCase() === s.toLowerCase()))
    .slice(0, 8);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = input.trim();
    if (!name) return;
    addFavorite(name);
    setInput("");
  }

  function toggleCity(city: string) {
    setAlertCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city],
    );
  }

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const result = await saveSubscription({
        email,
        bands: favorites,
        cities: alertCities,
      });
      setStatus(result);
      if (result.ok) setEmail("");
    });
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
      {/* Favorite bands */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Your favorite bands
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Saved in this browser. Star bands on any show, or add them here.
        </p>

        <form onSubmit={handleAdd} className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add a band…"
            aria-label="Add a favorite band"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Add
          </button>
        </form>

        {favorites.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {favorites.map((band) => (
              <li key={band}>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 py-1 pl-3 pr-1.5 text-xs font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                  {band}
                  <button
                    type="button"
                    onClick={() => removeFavorite(band)}
                    aria-label={`Remove ${band}`}
                    className="rounded-full px-1 text-violet-500 hover:bg-violet-200 hover:text-violet-900 dark:hover:bg-violet-800"
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
            No favorites yet.
          </p>
        )}

        {unusedSuggestions.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Playing soon:
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {unusedSuggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => addFavorite(s)}
                    className="rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-violet-400 hover:text-violet-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-violet-500"
                  >
                    + {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Email alerts */}
      <section className="border-t border-zinc-100 pt-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Email alerts
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Get an email when your favorite bands announce a Bay Area show.
        </p>

        <form onSubmit={handleSubscribe} className="mt-3 flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address for alerts"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />

          {cities.length > 0 && (
            <fieldset>
              <legend className="text-xs text-zinc-500 dark:text-zinc-400">
                Limit alerts to cities (optional):
              </legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {cities.map((city) => {
                  const on = alertCities.includes(city);
                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => toggleCity(city)}
                      aria-pressed={on}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        on
                          ? "border-violet-500 bg-violet-600 text-white"
                          : "border-zinc-300 text-zinc-600 hover:border-violet-400 dark:border-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? "Subscribing…" : "Subscribe to alerts"}
          </button>
        </form>

        {status && (
          <p
            role="status"
            className={`mt-3 text-xs ${
              status.ok
                ? "text-green-600 dark:text-green-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {status.message}
          </p>
        )}
      </section>
    </div>
  );
}
