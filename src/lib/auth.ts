"use client";

import { useCallback, useEffect, useState } from "react";

// Direct Google Identity Services (GIS) integration. No backend required —
// the static site loads Google's gsi/client script, hands it our OAuth
// client ID, gets back a signed ID token (JWT) with the user's profile
// claims, and persists the decoded user in localStorage.
//
// To enable: create an OAuth 2.0 Client ID (Web application) in Google
// Cloud Console with `https://<your-pages-domain>` as an Authorized
// JavaScript origin, then store the client ID as the
// `NEXT_PUBLIC_GOOGLE_CLIENT_ID` repo secret. The Pages workflow forwards
// it as a build-time env var.

const STORAGE_KEY = "driversguide.googleUser";
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const SCRIPT_URL = "https://accounts.google.com/gsi/client";

type GsiCredentialResponse = { credential: string };
type GsiButtonConfig = {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "small" | "medium" | "large";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (resp: GsiCredentialResponse) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, config: GsiButtonConfig) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

export type GoogleUser = {
  sub: string;
  email: string;
  name: string;
  picture: string;
  exp?: number;
};

export function isAuthAvailable(): boolean {
  return Boolean(CLIENT_ID);
}

// --- storage + cross-component subscriber ---------------------------------

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function readUser(): GoogleUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GoogleUser;
  } catch {
    return null;
  }
}

function writeUser(u: GoogleUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (u) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore quota / private mode
  }
  emit();
}

// --- JWT decode (claims only — Google's signature is verified by GIS) -----

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function handleCredential(resp: GsiCredentialResponse) {
  const claims = decodeJwt(resp.credential);
  if (!claims || typeof claims.sub !== "string") return;
  writeUser({
    sub: claims.sub as string,
    email: (claims.email as string) ?? "",
    name: (claims.name as string) ?? "",
    picture: (claims.picture as string) ?? "",
    exp: typeof claims.exp === "number" ? claims.exp : undefined,
  });
}

// --- script + GIS init ----------------------------------------------------

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google sign-in")));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google sign-in"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

let initialized = false;
async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  if (!CLIENT_ID) throw new Error("Google Client ID not configured");
  await loadScript();
  if (!window.google?.accounts?.id) {
    throw new Error("Google Identity Services unavailable");
  }
  window.google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: handleCredential,
    auto_select: false,
  });
  initialized = true;
}

// --- public API ------------------------------------------------------------

/** Render Google's official sign-in button into the given element. */
export async function renderGoogleButton(
  el: HTMLElement,
  theme: "light" | "dark",
): Promise<void> {
  await ensureInitialized();
  if (!window.google?.accounts?.id) return;
  window.google.accounts.id.renderButton(el, {
    type: "standard",
    theme: theme === "dark" ? "filled_black" : "outline",
    size: "large",
    text: "continue_with",
    shape: "pill",
    logo_alignment: "left",
    width: Math.max(220, Math.min(el.clientWidth || 280, 360)),
  });
}

export function signOut(): void {
  writeUser(null);
  if (typeof window !== "undefined" && window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
  }
}

export type AuthState = {
  loading: boolean;
  available: boolean;
  user: GoogleUser | null;
};

export function useAuth(): AuthState {
  const available = isAuthAvailable();
  const [user, setUser] = useState<GoogleUser | null>(() => readUser());

  useEffect(() => {
    const sync = () => setUser(readUser());
    listeners.add(sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return { loading: false, available, user };
}

export function useGoogleSignInButton(theme: "light" | "dark") {
  return useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      el.innerHTML = "";
      renderGoogleButton(el, theme).catch(() => {
        // Fallback: show a plain message if loading the script failed.
        el.textContent = "Couldn't load Google sign-in.";
      });
    },
    [theme],
  );
}
