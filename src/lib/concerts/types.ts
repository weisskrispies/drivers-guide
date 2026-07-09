// Shared types for the Bay Area Concert Radar.

/**
 * A concert as returned by a scraper source, before it is persisted.
 * `source` + `sourceId` must be stable so re-scrapes upsert instead of
 * duplicating.
 */
export interface ScrapedConcert {
  source: string;
  sourceId: string;
  title: string;
  artists: string[];
  venue: string | null;
  city: string | null;
  eventDate: string | null; // YYYY-MM-DD, local
  eventTime: string | null; // HH:MM, local
  startsAt: string | null; // ISO 8601, best effort
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  url: string | null;
  imageUrl: string | null;
  status: string;
}

/** A concert row as read back from storage for display. */
export interface Concert {
  id: string;
  source: string;
  sourceId: string;
  title: string;
  artists: string[];
  artistsNormalized: string[];
  venue: string | null;
  city: string | null;
  region: string | null;
  eventDate: string | null;
  eventTime: string | null;
  startsAt: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  url: string | null;
  imageUrl: string | null;
  status: string;
}

export interface ConcertFilters {
  /** Free-text search over title/artists/venue. */
  query?: string;
  /** Restrict to these normalized cities (e.g. ['oakland','berkeley']). */
  cities?: string[];
  /** Only shows on/after this date (YYYY-MM-DD). */
  from?: string;
  /** Only shows on/before this date (YYYY-MM-DD). */
  to?: string;
  /** Only shows matching one of these (normalized) band names. */
  bands?: string[];
}

/** A source knows how to fetch concerts for the Bay Area. */
export interface ConcertSource {
  name: string;
  /** True when the source has the config (API keys etc.) it needs. */
  isConfigured(): boolean;
  fetchConcerts(): Promise<ScrapedConcert[]>;
}
