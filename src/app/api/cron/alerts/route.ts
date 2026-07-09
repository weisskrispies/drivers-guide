import type { NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { runAlerts } from "@/lib/concerts/alerts";

// Match new concerts to subscribers' favorite bands and email them.
// Scheduled via vercel.json; also triggerable manually with the CRON_SECRET.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const report = await runAlerts();
    return Response.json({ ok: true, report });
  } catch (err) {
    console.error("[cron/alerts] failed:", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const POST = GET;
