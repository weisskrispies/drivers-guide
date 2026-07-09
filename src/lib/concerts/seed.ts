import type { ScrapedConcert } from "./types";

// A small hand-built dataset of representative Bay Area shows. It serves two
// purposes:
//   1. The site renders something meaningful before any real scrape has run
//      (and even with zero backend configured).
//   2. It's used as a fallback source so demos / local dev aren't blank.
//
// Dates are generated relative to "today" at read time so the list always
// looks upcoming — see `getSeedConcerts()`.

interface SeedTemplate {
  sourceId: string;
  title: string;
  artists: string[];
  venue: string;
  city: string;
  daysFromNow: number;
  eventTime: string;
  priceMin: number;
  priceMax: number;
  url: string;
}

const SEED_TEMPLATES: SeedTemplate[] = [
  {
    sourceId: "seed-fox-khruangbin",
    title: "Khruangbin",
    artists: ["Khruangbin"],
    venue: "Fox Theater",
    city: "Oakland",
    daysFromNow: 6,
    eventTime: "20:00",
    priceMin: 55,
    priceMax: 95,
    url: "https://example.com/shows/khruangbin-fox",
  },
  {
    sourceId: "seed-greek-vampire-weekend",
    title: "Vampire Weekend",
    artists: ["Vampire Weekend"],
    venue: "Greek Theatre",
    city: "Berkeley",
    daysFromNow: 12,
    eventTime: "19:30",
    priceMin: 60,
    priceMax: 120,
    url: "https://example.com/shows/vampire-weekend-greek",
  },
  {
    sourceId: "seed-fillmore-japanese-breakfast",
    title: "Japanese Breakfast",
    artists: ["Japanese Breakfast"],
    venue: "The Fillmore",
    city: "San Francisco",
    daysFromNow: 3,
    eventTime: "20:00",
    priceMin: 45,
    priceMax: 75,
    url: "https://example.com/shows/japanese-breakfast-fillmore",
  },
  {
    sourceId: "seed-chapel-mount-eerie",
    title: "Mount Eerie",
    artists: ["Mount Eerie"],
    venue: "The Chapel",
    city: "San Francisco",
    daysFromNow: 20,
    eventTime: "20:30",
    priceMin: 30,
    priceMax: 30,
    url: "https://example.com/shows/mount-eerie-chapel",
  },
  {
    sourceId: "seed-uc-theatre-idles",
    title: "IDLES",
    artists: ["IDLES"],
    venue: "UC Theatre",
    city: "Berkeley",
    daysFromNow: 9,
    eventTime: "19:00",
    priceMin: 40,
    priceMax: 65,
    url: "https://example.com/shows/idles-uc-theatre",
  },
  {
    sourceId: "seed-cornerstone-black-midi",
    title: "black midi",
    artists: ["black midi"],
    venue: "Cornerstone",
    city: "Berkeley",
    daysFromNow: 15,
    eventTime: "20:00",
    priceMin: 28,
    priceMax: 35,
    url: "https://example.com/shows/black-midi-cornerstone",
  },
  {
    sourceId: "seed-independent-turnstile",
    title: "Turnstile",
    artists: ["Turnstile", "Snail Mail"],
    venue: "The Independent",
    city: "San Francisco",
    daysFromNow: 5,
    eventTime: "20:00",
    priceMin: 35,
    priceMax: 35,
    url: "https://example.com/shows/turnstile-independent",
  },
  {
    sourceId: "seed-new-parish-thundercat",
    title: "Thundercat",
    artists: ["Thundercat"],
    venue: "The New Parish",
    city: "Oakland",
    daysFromNow: 25,
    eventTime: "21:00",
    priceMin: 50,
    priceMax: 70,
    url: "https://example.com/shows/thundercat-new-parish",
  },
  {
    sourceId: "seed-bimbos-khruangbin-dj",
    title: "Beach House",
    artists: ["Beach House"],
    venue: "Bimbo's 365 Club",
    city: "San Francisco",
    daysFromNow: 18,
    eventTime: "20:00",
    priceMin: 48,
    priceMax: 68,
    url: "https://example.com/shows/beach-house-bimbos",
  },
  {
    sourceId: "seed-startline-oakland-arena-tyler",
    title: "Tyler, the Creator",
    artists: ["Tyler, the Creator"],
    venue: "Oakland Arena",
    city: "Oakland",
    daysFromNow: 30,
    eventTime: "19:30",
    priceMin: 75,
    priceMax: 180,
    url: "https://example.com/shows/tyler-oakland-arena",
  },
  {
    sourceId: "seed-warfield-king-gizzard",
    title: "King Gizzard & the Lizard Wizard",
    artists: ["King Gizzard & the Lizard Wizard"],
    venue: "The Warfield",
    city: "San Francisco",
    daysFromNow: 8,
    eventTime: "20:00",
    priceMin: 45,
    priceMax: 60,
    url: "https://example.com/shows/king-gizzard-warfield",
  },
  {
    sourceId: "seed-freight-salvage-punch-brothers",
    title: "Punch Brothers",
    artists: ["Punch Brothers"],
    venue: "Freight & Salvage",
    city: "Berkeley",
    daysFromNow: 22,
    eventTime: "20:00",
    priceMin: 42,
    priceMax: 58,
    url: "https://example.com/shows/punch-brothers-freight",
  },
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Build seed concerts with dates anchored to `now` so they are always
 * upcoming. `now` is injected (defaults to current time) to keep this
 * deterministic in tests.
 */
export function getSeedConcerts(now: Date = new Date()): ScrapedConcert[] {
  return SEED_TEMPLATES.map((t) => {
    const d = new Date(now);
    d.setDate(d.getDate() + t.daysFromNow);
    const eventDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate(),
    )}`;
    const [hh, mm] = t.eventTime.split(":");
    const startsAt = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      Number(hh),
      Number(mm),
    ).toISOString();
    return {
      source: "seed",
      sourceId: t.sourceId,
      title: t.title,
      artists: t.artists,
      venue: t.venue,
      city: t.city,
      eventDate,
      eventTime: t.eventTime,
      startsAt,
      priceMin: t.priceMin,
      priceMax: t.priceMax,
      currency: "USD",
      url: t.url,
      imageUrl: null,
      status: "onsale",
    };
  });
}
