"use client";

// Cross-device sync via Google Drive's hidden "appDataFolder".
//
// Why this approach: it reuses the Google sign-in the app already has
// (no separate backend, no new secrets, free), and the data is keyed to
// the Google account so it follows the user across devices/logins.
//
// It is strictly additive: localStorage stays the working store. Sync
// only layers on top, and every failure is swallowed (returns
// null/false) so the app never breaks and never fakes success.
//
// One-time setup the owner must do: add the scope
//   https://www.googleapis.com/auth/drive.appdata
// to the OAuth consent screen of the existing NEXT_PUBLIC_GOOGLE_CLIENT_ID.

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const GSI_SRC = "https://accounts.google.com/gsi/client";
const FILE_NAME = "driversguide-state.json";

export interface SyncState {
  v: 1;
  completions: string[];
  home: { lat: number; lng: number; label: string } | null;
  updatedAt: number;
}

interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void;
}
interface Oauth2 {
  initTokenClient: (cfg: {
    client_id: string;
    scope: string;
    callback: (resp: { access_token?: string; error?: string }) => void;
    error_callback?: (err: { type?: string }) => void;
  }) => TokenClient;
}

function oauth2(): Oauth2 | null {
  if (typeof window === "undefined") return null;
  const g = (
    window as unknown as {
      google?: { accounts?: { oauth2?: Oauth2 } };
    }
  ).google;
  return g?.accounts?.oauth2 ?? null;
}

export function isSyncConfigured(): boolean {
  return Boolean(CLIENT_ID);
}

function loadGis(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (oauth2()) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SRC}"]`,
    );
    const done = () => resolve(Boolean(oauth2()));
    if (existing) {
      existing.addEventListener("load", done, { once: true });
      // It may already be loaded but oauth2 attached late — poll briefly.
      let tries = 0;
      const t = setInterval(() => {
        if (oauth2() || tries++ > 40) {
          clearInterval(t);
          resolve(Boolean(oauth2()));
        }
      }, 50);
      return;
    }
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.onload = done;
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

let cachedToken: { value: string; exp: number } | null = null;

/** Request a Drive-appdata access token. `silent` tries without UI
 *  (works once the user has consented). Returns null on any failure. */
export async function getDriveToken(
  silent: boolean,
): Promise<string | null> {
  if (!CLIENT_ID) return null;
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const ok = await loadGis();
  const o = oauth2();
  if (!ok || !o) return null;

  return new Promise<string | null>((resolve) => {
    let settled = false;
    const finish = (v: string | null) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    try {
      const client = o.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (resp) => {
          if (resp.access_token) {
            cachedToken = {
              value: resp.access_token,
              exp: Date.now() + 55 * 60_000,
            };
            finish(resp.access_token);
          } else {
            finish(null);
          }
        },
        error_callback: () => finish(null),
      });
      client.requestAccessToken({ prompt: silent ? "" : "consent" });
      // Safety timeout so we never hang the UI.
      setTimeout(() => finish(null), silent ? 4000 : 90_000);
    } catch {
      finish(null);
    }
  });
}

async function findFileId(token: string): Promise<string | null> {
  try {
    const url =
      "https://www.googleapis.com/drive/v3/files" +
      "?spaces=appDataFolder" +
      `&q=${encodeURIComponent(`name='${FILE_NAME}'`)}` +
      "&fields=files(id)";
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { files?: { id?: string }[] };
    return j.files?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function pullState(
  token: string,
): Promise<SyncState | null> {
  try {
    const id = await findFileId(token);
    if (!id) return null;
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as Partial<SyncState>;
    if (!j || !Array.isArray(j.completions)) return null;
    return {
      v: 1,
      completions: j.completions.filter((s) => typeof s === "string"),
      home:
        j.home &&
        typeof j.home.lat === "number" &&
        typeof j.home.lng === "number"
          ? {
              lat: j.home.lat,
              lng: j.home.lng,
              label: String(j.home.label ?? "Home"),
            }
          : null,
      updatedAt: typeof j.updatedAt === "number" ? j.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

export async function pushState(
  token: string,
  state: SyncState,
): Promise<boolean> {
  try {
    const id = await findFileId(token);
    const body = JSON.stringify(state);
    if (id) {
      const res = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body,
          signal: AbortSignal.timeout(10000),
        },
      );
      return res.ok;
    }
    // Create: multipart (metadata + content) in the appData space.
    const boundary = "dg" + Math.random().toString(36).slice(2);
    const multipart =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify({ name: FILE_NAME, parents: ["appDataFolder"] }) +
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
      body +
      `\r\n--${boundary}--`;
    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipart,
        signal: AbortSignal.timeout(10000),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
