import type { Concert } from "./types";

/** Human-friendly date like "Fri, Jul 18". */
export function formatConcertDate(concert: Concert): string {
  if (!concert.eventDate) return "Date TBA";
  const [y, m, d] = concert.eventDate.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** "8:00 PM" from a 24h "HH:MM" string. */
export function formatConcertTime(concert: Concert): string | null {
  if (!concert.eventTime) return null;
  const [hh, mm] = concert.eventTime.split(":").map(Number);
  if (Number.isNaN(hh)) return null;
  const dt = new Date(2000, 0, 1, hh, mm ?? 0);
  return dt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatPrice(concert: Concert): string | null {
  const { priceMin, priceMax } = concert;
  if (priceMin == null && priceMax == null) return null;
  const cur = concert.currency === "USD" || !concert.currency ? "$" : "";
  const fmt = (n: number) => `${cur}${Math.round(n)}`;
  if (priceMin != null && priceMax != null && priceMin !== priceMax) {
    return `${fmt(priceMin)}–${fmt(priceMax)}`;
  }
  const single = priceMin ?? priceMax!;
  return fmt(single);
}
