import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// One-click unsubscribe link target (used in alert emails).
// GET /api/unsubscribe?token=<unsubscribe_token>
export const dynamic = "force-dynamic";

function page(title: string, message: string, status: number): Response {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0a0a0a;color:#ededed;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;">
  <div style="max-width:420px;text-align:center;padding:24px;">
    <h1 style="font-size:20px;margin:0 0 8px;">${title}</h1>
    <p style="color:#a1a1aa;font-size:14px;margin:0 0 16px;">${message}</p>
    <a href="/" style="color:#a78bfa;font-size:14px;">Back to Concert Radar</a>
  </div>
</body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return page("Invalid link", "This unsubscribe link is missing its token.", 400);
  }

  const admin = createAdminClient();
  if (!admin) {
    return page(
      "Unavailable",
      "Alerts are not configured on this deployment.",
      503,
    );
  }

  const { data, error } = await admin
    .from("subscribers")
    .update({ alerts_enabled: false, updated_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("email");

  if (error) {
    return page("Something went wrong", "Please try again later.", 500);
  }
  if (!data || data.length === 0) {
    return page(
      "Link expired",
      "We couldn't find a subscription for this link.",
      404,
    );
  }
  return page(
    "You're unsubscribed",
    `${data[0].email} will no longer receive concert alerts.`,
    200,
  );
}
