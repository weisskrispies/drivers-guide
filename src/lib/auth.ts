"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

// Singleton — env vars are inlined at build time by Next, so this never
// changes between renders. If they're missing, supabase() returns null and
// the auth UI degrades to a "configure Supabase to enable sign-in" hint.
let _client: SupabaseClient | null | undefined;

export function supabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    _client = null;
    return null;
  }
  _client = createBrowserClient(url, key);
  return _client;
}

export function isAuthAvailable(): boolean {
  return supabase() !== null;
}

export type AuthState = {
  loading: boolean;
  available: boolean;
  user: User | null;
  session: Session | null;
};

export function useAuth(): AuthState {
  // Compute the "no Supabase configured" terminal state synchronously so we
  // don't have to setState from inside an effect for that branch.
  const [state, setState] = useState<AuthState>(() => {
    const available = supabase() !== null;
    return {
      loading: available,
      available,
      user: null,
      session: null,
    };
  });

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    let active = true;
    sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState({
        loading: false,
        available: true,
        user: data.session?.user ?? null,
        session: data.session,
      });
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setState({
        loading: false,
        available: true,
        user: session?.user ?? null,
        session,
      });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  const sb = supabase();
  if (!sb) return { error: "Sign-in is not configured for this deployment." };
  const redirectTo =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : undefined;
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  await sb.auth.signOut();
}
