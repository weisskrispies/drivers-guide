import type { ConcertSource, ScrapedConcert } from "../types";
import { canonicalCity } from "../normalize";

// Ticketmaster Discovery API — https://developer.ticketmaster.com/
// Free API key. We query the San Francisco/Oakland/San Jose DMA (382) for
// music events, which covers Oakland, Berkeley, SF, San Jose and the rest of
// the Bay Area in one place.

const DISCOVERY_URL = "https://app.ticketmaster.com/discovery/v2/events.json";
const BAY_AREA_DMA = "382";
const PAGE_SIZE = 100;
const MAX_PAGES = 5; // Discovery API caps deep paging; 500 upcoming shows is plenty.

interface TmImage {
  url?: string;
  width?: number;
  ratio?: string;
}

interface TmEvent {
  id: string;
  name: string;
  url?: string;
  images?: TmImage[];
  dates?: {
    start?: { localDate?: string; localTime?: string; dateTime?: string };
    status?: { code?: string };
  };
  priceRanges?: Array<{ min?: number; max?: number; currency?: string }>;
  _embedded?: {
    venues?: Array<{ name?: string; city?: { name?: string } }>;
    attractions?: Array<{ name?: string }>;
  };
}

interface TmResponse {
  _embedded?: { events?: TmEvent[] };
  page?: { totalPages?: number; number?: number };
}

function pickImage(images: TmImage[] | undefined): string | null {
  if (!images || images.length === 0) return null;
  // Prefer a wide 16:9 image around 640px; otherwise the first.
  const preferred = images
    .filter((i) => i.url)
    .sort((a, b) => {
      const aScore = (a.ratio === "16_9" ? 1000 : 0) - Math.abs((a.width ?? 0) - 640);
      const bScore = (b.ratio === "16_9" ? 1000 : 0) - Math.abs((b.width ?? 0) - 640);
      return bScore - aScore;
    });
  return preferred[0]?.url ?? images[0]?.url ?? null;
}

function toScraped(ev: TmEvent): ScrapedConcert {
  const venue = ev._embedded?.venues?.[0];
  const attractions = ev._embedded?.attractions ?? [];
  const artists =
    attractions.length > 0
      ? attractions.map((a) => a.name).filter((n): n is string => Boolean(n))
      : [ev.name];
  const price = ev.priceRanges?.[0];
  const start = ev.dates?.start;
  return {
    source: "ticketmaster",
    sourceId: ev.id,
    title: ev.name,
    artists,
    venue: venue?.name ?? null,
    city: canonicalCity(venue?.city?.name ?? null),
    eventDate: start?.localDate ?? null,
    eventTime: start?.localTime ? start.localTime.slice(0, 5) : null,
    startsAt: start?.dateTime ?? null,
    priceMin: price?.min ?? null,
    priceMax: price?.max ?? null,
    currency: price?.currency ?? null,
    url: ev.url ?? null,
    imageUrl: pickImage(ev.images),
    status: ev.dates?.status?.code ?? "onsale",
  };
}

export class TicketmasterSource implements ConcertSource {
  name = "ticketmaster";
  private apiKey: string | undefined;

  constructor(apiKey = process.env.TICKETMASTER_API_KEY) {
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async fetchConcerts(): Promise<ScrapedConcert[]> {
    if (!this.apiKey) return [];
    const all: ScrapedConcert[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({
        apikey: this.apiKey,
        dmaId: BAY_AREA_DMA,
        classificationName: "music",
        sort: "date,asc",
        size: String(PAGE_SIZE),
        page: String(page),
      });
      const res = await fetch(`${DISCOVERY_URL}?${params.toString()}`, {
        headers: { Accept: "application/json" },
        // Never cache scrape responses.
        cache: "no-store",
      });
      if (res.status === 429) {
        // Rate limited — stop early with what we have.
        break;
      }
      if (!res.ok) {
        throw new Error(
          `Ticketmaster Discovery API error ${res.status}: ${await res
            .text()
            .catch(() => "")}`.slice(0, 300),
        );
      }
      const data = (await res.json()) as TmResponse;
      const events = data._embedded?.events ?? [];
      for (const ev of events) {
        all.push(toScraped(ev));
      }
      const totalPages = data.page?.totalPages ?? 1;
      if (events.length === 0 || page + 1 >= totalPages) break;
    }
    return all;
  }
}
