import type { NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { runScrape } from "@/lib/concerts/scrape";

// Scrape all configured sources and upsert Bay Area shows.
// Scheduled via vercel.json; also triggerable manually with the CRON_SECRET.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const report = await runScrape();
    return Response.json({ ok: true, report });
  } catch (err) {
    console.error("[cron/scrape] failed:", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

// Allow POST too (some schedulers use POST).
export const POST = GET;
