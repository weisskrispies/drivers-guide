import type { SupabaseClient } from "@supabase/supabase-js";
import type { Concert } from "./types";
import { concertMatchesBands, normalizeName } from "./normalize";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailConfigured } from "@/lib/email";
import { buildAlertEmail } from "@/lib/email/templates";
import { todayISO } from "./repository";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function rowToConcert(r: Row): Concert {
  return {
    id: r.id,
    source: r.source,
    sourceId: r.source_id,
    title: r.title,
    artists: r.artists ?? [],
    artistsNormalized: r.artists_normalized ?? [],
    venue: r.venue ?? null,
    city: r.city ?? null,
    region: r.region ?? null,
    eventDate: r.event_date ?? null,
    eventTime: r.event_time ?? null,
    startsAt: r.starts_at ?? null,
    priceMin: r.price_min ?? null,
    priceMax: r.price_max ?? null,
    currency: r.currency ?? null,
    url: r.url ?? null,
    imageUrl: r.image_url ?? null,
    status: r.status ?? "onsale",
  };
}

interface Subscriber {
  id: string;
  email: string;
  favoriteBandsNormalized: string[];
  cities: string[];
  unsubscribeToken: string;
}

export interface AlertReport {
  ranAt: string;
  subscribersChecked: number;
  emailsSent: number;
  alertsRecorded: number;
  emailProvider: string;
  errors: string[];
}

/**
 * For each alert-enabled subscriber, find upcoming concerts that match a
 * favorite band and haven't been alerted yet, then email them and record the
 * sends. Safe to run repeatedly — sent_alerts dedupes.
 */
export async function runAlerts(): Promise<AlertReport> {
  const report: AlertReport = {
    ranAt: new Date().toISOString(),
    subscribersChecked: 0,
    emailsSent: 0,
    alertsRecorded: 0,
    emailProvider: emailConfigured() ? "resend" : "console",
    errors: [],
  };

  const admin = createAdminClient();
  if (!admin) {
    report.errors.push("Supabase admin client not configured");
    return report;
  }

  const subscribers = await loadSubscribers(admin);
  report.subscribersChecked = subscribers.length;
  if (subscribers.length === 0) return report;

  // Load all upcoming concerts once; match in-memory per subscriber.
  const concerts = await loadUpcomingConcerts(admin);

  for (const sub of subscribers) {
    if (sub.favoriteBandsNormalized.length === 0) continue;
    try {
      const already = await loadSentConcertIds(admin, sub.id);
      const cityFilter = sub.cities.map((c) => normalizeName(c));

      const matches: Array<{ concert: Concert; bands: string[] }> = [];
      for (const concert of concerts) {
        if (already.has(concert.id)) continue;
        if (
          cityFilter.length &&
          !cityFilter.includes(normalizeName(concert.city ?? ""))
        ) {
          continue;
        }
        const bands = concertMatchesBands(
          concert.artistsNormalized,
          normalizeName(concert.title),
          sub.favoriteBandsNormalized,
        );
        if (bands.length) matches.push({ concert, bands });
      }

      if (matches.length === 0) continue;

      const email = buildAlertEmail(matches, sub.unsubscribeToken);
      const result = await sendEmail({
        to: sub.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });

      if (!result.ok) {
        report.errors.push(`send to ${sub.email}: ${result.error}`);
        continue;
      }
      report.emailsSent += 1;

      // Record sends so we never double-alert.
      const rows = matches.map((m) => ({
        subscriber_id: sub.id,
        concert_id: m.concert.id,
      }));
      const { error } = await admin
        .from("sent_alerts")
        .upsert(rows, { onConflict: "subscriber_id,concert_id" });
      if (error) {
        report.errors.push(`record sends for ${sub.email}: ${error.message}`);
      } else {
        report.alertsRecorded += rows.length;
      }
    } catch (err) {
      report.errors.push(
        `subscriber ${sub.email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  return report;
}

async function loadSubscribers(admin: SupabaseClient): Promise<Subscriber[]> {
  const { data, error } = await admin
    .from("subscribers")
    .select(
      "id, email, favorite_bands_normalized, cities, unsubscribe_token, alerts_enabled",
    )
    .eq("alerts_enabled", true);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    favoriteBandsNormalized: r.favorite_bands_normalized ?? [],
    cities: r.cities ?? [],
    unsubscribeToken: r.unsubscribe_token,
  }));
}

async function loadUpcomingConcerts(
  admin: SupabaseClient,
): Promise<Concert[]> {
  const { data, error } = await admin
    .from("concerts")
    .select("*")
    .gte("event_date", todayISO())
    .order("event_date", { ascending: true })
    .limit(2000);
  if (error) throw error;
  return (data ?? []).map(rowToConcert);
}

async function loadSentConcertIds(
  admin: SupabaseClient,
  subscriberId: string,
): Promise<Set<string>> {
  const { data, error } = await admin
    .from("sent_alerts")
    .select("concert_id")
    .eq("subscriber_id", subscriberId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.concert_id as string));
}
