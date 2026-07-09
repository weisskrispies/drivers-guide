import type { ScrapedConcert } from "./types";
import { configuredSources } from "./sources";
import { upsertConcerts, type UpsertResult } from "./repository";
import { isBayAreaCity } from "./normalize";

export interface ScrapeReport {
  ranAt: string;
  sources: Array<{ name: string; fetched: number; error?: string }>;
  totalFetched: number;
  bayAreaKept: number;
  upsert: UpsertResult | null;
}

/**
 * Run every configured source, keep only Bay Area shows, and upsert them.
 * Source failures are isolated so one bad source doesn't abort the whole run.
 */
export async function runScrape(): Promise<ScrapeReport> {
  const sources = configuredSources();
  const report: ScrapeReport = {
    ranAt: new Date().toISOString(),
    sources: [],
    totalFetched: 0,
    bayAreaKept: 0,
    upsert: null,
  };

  const collected: ScrapedConcert[] = [];
  for (const source of sources) {
    try {
      const events = await source.fetchConcerts();
      report.sources.push({ name: source.name, fetched: events.length });
      report.totalFetched += events.length;
      collected.push(...events);
    } catch (err) {
      report.sources.push({
        name: source.name,
        fetched: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Keep only Bay Area music shows with a date.
  const bayArea = dedupe(
    collected.filter((c) => c.eventDate && isBayAreaCity(c.city)),
  );
  report.bayAreaKept = bayArea.length;

  if (bayArea.length > 0) {
    report.upsert = await upsertConcerts(bayArea);
  }
  return report;
}

/** Drop duplicate (source, sourceId) pairs before upserting. */
function dedupe(concerts: ScrapedConcert[]): ScrapedConcert[] {
  const seen = new Set<string>();
  const out: ScrapedConcert[] = [];
  for (const c of concerts) {
    const key = `${c.source}:${c.sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}
