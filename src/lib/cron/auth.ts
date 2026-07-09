import type { NextRequest } from "next/server";

// Guards the cron endpoints. Accepts either:
//   - `Authorization: Bearer <CRON_SECRET>` (how Vercel Cron authenticates), or
//   - `?secret=<CRON_SECRET>` (handy for manual curl triggers).
// If CRON_SECRET is unset, the endpoints are refused entirely rather than left
// open to the public.
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;

  return false;
}
