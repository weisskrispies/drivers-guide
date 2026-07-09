import { listConcerts } from "@/lib/concerts/repository";
import { ConcertApp } from "./components/ConcertApp";

// Always render fresh listings.
export const dynamic = "force-dynamic";

export default async function Home() {
  const { concerts, usingFallback } = await listConcerts();
  const cities = [...new Set(concerts.map((c) => c.city).filter(Boolean))].sort() as string[];

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
            <span aria-hidden>🎸</span> Bay Area
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            Concert Radar
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
            Every upcoming show across Oakland, Berkeley, San Francisco and the
            greater Bay Area — auto-updated. Star your favorite bands to filter
            the list and get an email the moment they announce a date.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <ConcertApp
          concerts={concerts}
          cities={cities}
          usingFallback={usingFallback}
        />
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-zinc-400 sm:px-6 dark:text-zinc-600">
        Concert Radar · listings refresh automatically · favorites are stored in
        your browser.
      </footer>
    </div>
  );
}
