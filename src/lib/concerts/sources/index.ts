import type { ConcertSource } from "../types";
import { TicketmasterSource } from "./ticketmaster";
import { SeedSource } from "./seed-source";

// Register scraper sources here. Add new adapters (Songkick, Bandsintown,
// individual venue scrapers, ...) by implementing ConcertSource and pushing
// an instance into this list.
export function allSources(): ConcertSource[] {
  return [new TicketmasterSource(), new SeedSource()];
}

/** Sources that have the configuration they need to actually run. */
export function configuredSources(): ConcertSource[] {
  return allSources().filter((s) => s.isConfigured());
}
