// Normalization + matching helpers shared by scraping, storage, and alerts.

/** Lowercase, collapse whitespace, strip most punctuation for stable matching. */
export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeMany(values: Iterable<string>): string[] {
  const seen = new Set<string>();
  for (const v of values) {
    const n = normalizeName(v);
    if (n) seen.add(n);
  }
  return [...seen];
}

// Bay Area cities we bucket into the "bay-area" region. The map lets us fold
// variants (e.g. "SF", "San Francisco") into one display label.
const CITY_ALIASES: Record<string, string> = {
  "san francisco": "San Francisco",
  sf: "San Francisco",
  oakland: "Oakland",
  berkeley: "Berkeley",
  "san jose": "San Jose",
  emeryville: "Emeryville",
  alameda: "Alameda",
  richmond: "Richmond",
  "walnut creek": "Walnut Creek",
  "mountain view": "Mountain View",
  "palo alto": "Palo Alto",
  "santa clara": "Santa Clara",
  "san rafael": "San Rafael",
  "santa cruz": "Santa Cruz",
  "san mateo": "San Mateo",
  concord: "Concord",
  fairfax: "Fairfax",
  "san francisco bay area": "San Francisco",
};

const BAY_AREA_CITIES = new Set(Object.keys(CITY_ALIASES));

/** Canonical display name for a city, or the title-cased input if unknown. */
export function canonicalCity(city: string | null | undefined): string | null {
  if (!city) return null;
  const n = normalizeName(city);
  if (CITY_ALIASES[n]) return CITY_ALIASES[n];
  return city
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** True if a city is one we consider "Bay Area" for the region bucket. */
export function isBayAreaCity(city: string | null | undefined): boolean {
  if (!city) return false;
  return BAY_AREA_CITIES.has(normalizeName(city));
}

export function regionForCity(city: string | null | undefined): string | null {
  return isBayAreaCity(city) ? "bay-area" : null;
}

/**
 * Does a concert (by its normalized artist list + normalized title) match any
 * of the subscriber's normalized favorite bands? Uses word-boundary-ish
 * substring matching so "Phish" matches a "Phish" headliner inside a longer
 * event title, without matching unrelated substrings.
 */
export function concertMatchesBands(
  concertArtistsNormalized: string[],
  concertTitleNormalized: string,
  favoriteBandsNormalized: string[],
): string[] {
  const matched: string[] = [];
  for (const band of favoriteBandsNormalized) {
    if (!band) continue;
    const inArtists = concertArtistsNormalized.some(
      (a) => a === band || tokenizedContains(a, band),
    );
    const inTitle = tokenizedContains(concertTitleNormalized, band);
    if (inArtists || inTitle) matched.push(band);
  }
  return matched;
}

/** True if `needle` appears in `haystack` as a run of whole tokens. */
function tokenizedContains(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  if (haystack === needle) return true;
  return (
    haystack === needle ||
    haystack.startsWith(needle + " ") ||
    haystack.endsWith(" " + needle) ||
    haystack.includes(" " + needle + " ")
  );
}
