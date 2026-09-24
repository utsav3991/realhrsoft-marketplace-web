import { ApiError, api, setAccessTokenRenewer, unwrap } from "@/shared/api";

import { getAccessToken, setAccessToken } from "./token-store";

// Refresh rotates the cookie's secret, so concurrent refreshes (two tabs, StrictMode double
// effects, parallel 401s) must not race. One in-flight refresh per tab, serialized across
// tabs with the Web Locks API where available.
const REFRESH_LOCK = "marketplace.auth.refresh";
const SESSION_CHANNEL = "marketplace.auth";

let inflightRefresh: Promise<boolean> | null = null;

async function refreshOnce(): Promise<boolean> {
  try {
    const tokens = await unwrap(api.POST("/auth/refresh"));
    setAccessToken(tokens.access_token);
    return true;
  } catch (error) {
    // 401: no or expired refresh session. 403: untrusted Origin (misconfiguration).
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      setAccessToken(null);
    }
    return false;
  }
}

/** Obtains a fresh access token from the httpOnly refresh cookie. Resolves false if signed out. */
export function renewAccessToken(): Promise<boolean> {
  inflightRefresh ??= (
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request(REFRESH_LOCK, refreshOnce)
      : refreshOnce()
  ).finally(() => {
    inflightRefresh = null;
  });
  return inflightRefresh;
}

setAccessTokenRenewer(renewAccessToken);

export async function login(credentials: { email: string; password: string }): Promise<void> {
  const tokens = await unwrap(api.POST("/auth/login", { body: credentials }));
  setAccessToken(tokens.access_token);
}

export async function logout(): Promise<void> {
  try {
    await unwrap(api.POST("/auth/logout"));
  } catch {
    // Already signed out server-side; the local session is cleared regardless.
  } finally {
    setAccessToken(null);
    broadcast()?.postMessage("logout");
  }
}

function broadcast(): BroadcastChannel | null {
  return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(SESSION_CHANNEL);
}

/** Signs this tab out when another tab logs out. Returns an unsubscribe function. */
export function listenForLogoutElsewhere(): () => void {
  const channel = broadcast();
  if (!channel) return () => undefined;
  channel.onmessage = (event: MessageEvent) => {
    if (event.data === "logout" && getAccessToken()) setAccessToken(null);
  };
  return () => channel.close();
}
