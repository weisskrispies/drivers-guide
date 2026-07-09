import type { ConcertSource, ScrapedConcert } from "../types";
import { getSeedConcerts } from "../seed";

// A source that emits the built-in seed dataset. Enabled only when explicitly
// requested (SEED_CONCERTS=1) so demo data can be scraped into a real DB
// without needing any external API key.
export class SeedSource implements ConcertSource {
  name = "seed";

  isConfigured(): boolean {
    return process.env.SEED_CONCERTS === "1";
  }

  async fetchConcerts(): Promise<ScrapedConcert[]> {
    return getSeedConcerts();
  }
}
