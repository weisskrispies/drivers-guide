import type { Concert } from "@/lib/concerts/types";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function formatDate(date: string | null, time: string | null): string {
  if (!date) return "Date TBA";
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const formatted = dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return time ? `${formatted} · ${time}` : formatted;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface AlertEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Build the "new shows matching your bands" alert email.
 * `matches` pairs each concert with the favorite band(s) that triggered it.
 */
export function buildAlertEmail(
  matches: Array<{ concert: Concert; bands: string[] }>,
  unsubscribeToken: string,
): AlertEmail {
  const count = matches.length;
  const subject =
    count === 1
      ? `🎸 New Bay Area show: ${matches[0].concert.title}`
      : `🎸 ${count} new Bay Area shows for your bands`;

  const unsubUrl = `${siteUrl()}/api/unsubscribe?token=${unsubscribeToken}`;

  const rows = matches
    .map(({ concert, bands }) => {
      const when = escapeHtml(formatDate(concert.eventDate, concert.eventTime));
      const where = escapeHtml(
        [concert.venue, concert.city].filter(Boolean).join(", ") ||
          "Bay Area",
      );
      const title = escapeHtml(concert.title);
      const trigger = escapeHtml(bands.join(", "));
      const link = concert.url ? escapeHtml(concert.url) : siteUrl();
      return `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:16px;font-weight:600;color:#111827;">
            <a href="${link}" style="color:#111827;text-decoration:none;">${title}</a>
          </div>
          <div style="font-size:14px;color:#4b5563;margin-top:4px;">${when} · ${where}</div>
          <div style="font-size:12px;color:#7c3aed;margin-top:4px;">matches: ${trigger}</div>
        </td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <h1 style="font-size:20px;color:#111827;margin:0 0 4px;">Bay Area Concert Radar</h1>
    <p style="font-size:14px;color:#6b7280;margin:0 0 16px;">
      New show${count === 1 ? "" : "s"} matching your favorite bands:
    </p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <p style="margin:24px 0 0;">
      <a href="${siteUrl()}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">Browse all shows</a>
    </p>
    <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;">
      You're getting this because you subscribed to alerts.
      <a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a>.
    </p>
  </div>
</body>
</html>`;

  const text = [
    "Bay Area Concert Radar",
    `New show${count === 1 ? "" : "s"} matching your favorite bands:`,
    "",
    ...matches.map(({ concert, bands }) => {
      const when = formatDate(concert.eventDate, concert.eventTime);
      const where =
        [concert.venue, concert.city].filter(Boolean).join(", ") || "Bay Area";
      return `- ${concert.title} — ${when} — ${where} (matches: ${bands.join(
        ", ",
      )})\n  ${concert.url ?? siteUrl()}`;
    }),
    "",
    `Browse all shows: ${siteUrl()}`,
    `Unsubscribe: ${unsubUrl}`,
  ].join("\n");

  return { subject, html, text };
}
