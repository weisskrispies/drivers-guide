import type { SupabaseClient } from "@supabase/supabase-js";
import type { Concert, ConcertFilters, ScrapedConcert } from "./types";
import {
  normalizeName,
  normalizeMany,
  canonicalCity,
  regionForCity,
} from "./normalize";
import { getSeedConcerts } from "./seed";
import { createAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function rowToConcert(r: Row): Concert {
  return {
    id: r.id,
    source: r.source,
    sourceId: r.source_id,
    title: r.title,
    artists: r.artists ?? [],
    artistsNormalized: r.artists_normalized ?? [],
    venue: r.venue ?? null,
    city: r.city ?? null,
    region: r.region ?? null,
    eventDate: r.event_date ?? null,
    eventTime: r.event_time ?? null,
    startsAt: r.starts_at ?? null,
    priceMin: r.price_min ?? null,
    priceMax: r.price_max ?? null,
    currency: r.currency ?? null,
    url: r.url ?? null,
    imageUrl: r.image_url ?? null,
    status: r.status ?? "onsale",
  };
}

function scrapedToRow(c: ScrapedConcert): Row {
  const city = canonicalCity(c.city);
  return {
    source: c.source,
    source_id: c.sourceId,
    title: c.title,
    artists: c.artists,
    artists_normalized: normalizeMany(c.artists),
    venue: c.venue,
    city,
    region: regionForCity(city),
    event_date: c.eventDate,
    event_time: c.eventTime,
    starts_at: c.startsAt,
    price_min: c.priceMin,
    price_max: c.priceMax,
    currency: c.currency,
    url: c.url,
    image_url: c.imageUrl,
    status: c.status,
    updated_at: new Date().toISOString(),
  };
}

/** Turn a ScrapedConcert into an in-memory Concert (for the seed fallback). */
function scrapedToConcert(c: ScrapedConcert): Concert {
  const city = canonicalCity(c.city);
  return {
    id: `${c.source}:${c.sourceId}`,
    source: c.source,
    sourceId: c.sourceId,
    title: c.title,
    artists: c.artists,
    artistsNormalized: normalizeMany(c.artists),
    venue: c.venue,
    city,
    region: regionForCity(city),
    eventDate: c.eventDate,
    eventTime: c.eventTime,
    startsAt: c.startsAt,
    priceMin: c.priceMin,
    priceMax: c.priceMax,
    currency: c.currency,
    url: c.url,
    imageUrl: c.imageUrl,
    status: c.status,
  };
}

/** In-memory filtering shared by the seed fallback. */
export function applyFilters(
  concerts: Concert[],
  filters: ConcertFilters,
): Concert[] {
  const q = filters.query ? normalizeName(filters.query) : "";
  const cities = filters.cities?.map((c) => normalizeName(c)) ?? [];
  const bands = filters.bands?.map((b) => normalizeName(b)).filter(Boolean) ?? [];
  return concerts.filter((c) => {
    if (filters.from && c.eventDate && c.eventDate < filters.from) return false;
    if (filters.to && c.eventDate && c.eventDate > filters.to) return false;
    if (cities.length && !cities.includes(normalizeName(c.city ?? ""))) {
      return false;
    }
    if (bands.length) {
      const hay = [...c.artistsNormalized, normalizeName(c.title)];
      const hit = bands.some((b) => hay.some((h) => h.includes(b)));
      if (!hit) return false;
    }
    if (q) {
      const hay = normalizeName(
        [c.title, c.venue ?? "", c.city ?? "", ...c.artists].join(" "),
      );
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function sortConcerts(concerts: Concert[]): Concert[] {
  return [...concerts].sort((a, b) => {
    const ad = a.eventDate ?? "9999-12-31";
    const bd = b.eventDate ?? "9999-12-31";
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (a.eventTime ?? "").localeCompare(b.eventTime ?? "");
  });
}

/** Today's date as YYYY-MM-DD in the server's timezone. */
export function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * List concerts for display. Falls back to the seed dataset whenever Supabase
 * is not configured or the query fails, so the site always renders.
 */
export async function listConcerts(
  filters: ConcertFilters = {},
): Promise<{ concerts: Concert[]; usingFallback: boolean }> {
  const admin = createAdminClient();
  if (admin) {
    try {
      const rows = await queryConcerts(admin, filters);
      return { concerts: rows, usingFallback: false };
    } catch (err) {
      console.error("[concerts] DB query failed, using seed fallback:", err);
    }
  }
  const seed = sortConcerts(getSeedConcerts().map(scrapedToConcert));
  return { concerts: applyFilters(seed, filters), usingFallback: true };
}

async function queryConcerts(
  client: SupabaseClient,
  filters: ConcertFilters,
): Promise<Concert[]> {
  let query = client
    .from("concerts")
    .select("*")
    .gte("event_date", filters.from ?? todayISO())
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true })
    .limit(500);

  if (filters.to) query = query.lte("event_date", filters.to);
  if (filters.cities?.length) {
    const canon = filters.cities
      .map((c) => canonicalCity(c))
      .filter((c): c is string => Boolean(c));
    if (canon.length) query = query.in("city", canon);
  }
  if (filters.bands?.length) {
    const norm = normalizeMany(filters.bands);
    if (norm.length) query = query.overlaps("artists_normalized", norm);
  }

  const { data, error } = await query;
  if (error) throw error;
  let concerts = (data ?? []).map(rowToConcert);
  // Free-text query is applied in-memory (covers title/venue/artist).
  if (filters.query) {
    concerts = applyFilters(concerts, { query: filters.query });
  }
  return concerts;
}

/** Distinct cities present in storage (or seed), for the filter UI. */
export async function listCities(): Promise<string[]> {
  const { concerts } = await listConcerts();
  const set = new Set<string>();
  for (const c of concerts) if (c.city) set.add(c.city);
  return [...set].sort();
}

export interface UpsertResult {
  fetched: number;
  upserted: number;
  bySource: Record<string, number>;
}

/**
 * Upsert scraped concerts into storage, deduping on (source, source_id).
 * Requires the admin client; throws if not configured.
 */
export async function upsertConcerts(
  scraped: ScrapedConcert[],
): Promise<UpsertResult> {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error(
      "Supabase admin client not configured (need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)",
    );
  }
  const bySource: Record<string, number> = {};
  for (const c of scraped) bySource[c.source] = (bySource[c.source] ?? 0) + 1;

  const rows = scraped.map(scrapedToRow);
  // Chunk to stay well under payload limits.
  const CHUNK = 200;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error, count } = await admin
      .from("concerts")
      .upsert(chunk, { onConflict: "source,source_id", count: "exact" });
    if (error) throw error;
    upserted += count ?? chunk.length;
  }
  return { fetched: scraped.length, upserted, bySource };
}
