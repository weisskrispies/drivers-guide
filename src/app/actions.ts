"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeMany } from "@/lib/concerts/normalize";

export interface SubscriptionInput {
  email: string;
  bands: string[];
  cities: string[];
}

export interface SubscriptionResult {
  ok: boolean;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Create or update an alert subscription for an email address. Favorite bands
 * and optional city filters come from the browser UI. Idempotent on email.
 */
export async function saveSubscription(
  input: SubscriptionInput,
): Promise<SubscriptionResult> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  const bands = dedupePreserve(input.bands.map((b) => b.trim()).filter(Boolean));
  if (bands.length === 0) {
    return {
      ok: false,
      message: "Add at least one favorite band before subscribing to alerts.",
    };
  }
  const cities = dedupePreserve(
    input.cities.map((c) => c.trim()).filter(Boolean),
  );

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      message:
        "Email alerts aren't configured on this deployment yet, but your favorites are saved in this browser.",
    };
  }

  const row = {
    email,
    favorite_bands: bands,
    favorite_bands_normalized: normalizeMany(bands),
    cities,
    alerts_enabled: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("subscribers")
    .upsert(row, { onConflict: "email" });

  if (error) {
    console.error("[saveSubscription] upsert failed:", error);
    return {
      ok: false,
      message: "Couldn't save your subscription. Please try again.",
    };
  }

  return {
    ok: true,
    message: `You're subscribed! We'll email ${email} when your bands play the Bay Area.`,
  };
}

function dedupePreserve(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}
