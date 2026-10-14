import {
  ApiError,
  api,
  clearDeniedOrganizations,
  clearDeniedClients,
  setAccessTokenRenewer,
  setActiveOrganizationId,
  setActiveClientId,
  unwrap,
} from "@/shared/api";

import { getAccessToken, setAccessToken } from "./token-store";

// Refresh rotates the cookie's secret, so concurrent refreshes (two tabs, StrictMode double
// effects, parallel 401s) must not race. One in-flight refresh per tab, serialized across
// tabs with the Web Locks API where available.
const REFRESH_LOCK = "marketplace.auth.refresh";
const SESSION_CHANNEL = "marketplace.auth";
// Different BroadcastChannel instances in the same tab also receive each other's messages.
const SESSION_SENDER = crypto.randomUUID();
type SessionDestination = "/partner" | "/admin/users" | "/login";

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

/**
 * Superusers only: sign in as a partner user. The refresh cookie now holds that session and
 * the superuser's own waits server-side for endImpersonation(). Other tabs share the cookie,
 * so they are told to reload their session.
 */
export async function impersonate(body: { user_id: string; reason: string }): Promise<void> {
  await withSessionLock(async () => {
    const tokens = await unwrap(api.POST("/auth/impersonation", { body }));
    switchedSession(tokens.access_token, "/partner");
  });
}

/**
 * Ends an impersonation. Resolves true when the superuser's own session was restored, false
 * when it could not be (they must sign in again).
 */
export async function endImpersonation(): Promise<boolean> {
  return withSessionLock(async () => {
    const data = await unwrap(api.POST("/auth/impersonation/end"));
    switchedSession(data?.access_token ?? null, data ? "/admin/users" : "/login");
    return Boolean(data);
  });
}

function withSessionLock<T>(operation: () => Promise<T>): Promise<T> {
  return typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request(REFRESH_LOCK, operation)
    : operation();
}

function switchedSession(accessToken: string | null, destination: SessionDestination): void {
  clearOrganizationScope();
  setAccessToken(accessToken);
  announce("session-changed", destination);
}

export async function logout(): Promise<void> {
  try {
    await unwrap(api.POST("/auth/logout"));
  } catch {
    // Already signed out server-side; the local session is cleared regardless.
  } finally {
    setAccessToken(null);
    clearOrganizationScope();
    announce("logout");
  }
}

/**
 * The selected organization belongs to the signed-out user. Kept, the next sign-in in this tab
 * would send it as X-Organization-ID on /auth/me and get 403 when that user is not a member.
 */
function clearOrganizationScope(): void {
  setActiveOrganizationId(null);
  clearDeniedOrganizations();
  setActiveClientId(null);
  clearDeniedClients();
}

function announce(type: "session-changed" | "logout", destination?: SessionDestination): void {
  const channel = broadcast();
  channel?.postMessage({ type, sender: SESSION_SENDER, destination });
  channel?.close();
}

function broadcast(): BroadcastChannel | null {
  return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(SESSION_CHANNEL);
}

/**
 * Signs this tab out when another tab logs out, and calls `onSessionChanged` when another tab
 * starts or ends an impersonation (the shared cookie now names another session). Returns an
 * unsubscribe function.
 */
export function listenForLogoutElsewhere(
  onSessionChanged?: (destination?: SessionDestination) => void,
): () => void {
  const channel = broadcast();
  if (!channel) return () => undefined;
  channel.onmessage = (event: MessageEvent) => {
    const message = event.data;
    if (message?.sender === SESSION_SENDER) return;
    // Accept the old string format while other tabs may still run the previous bundle.
    const type = typeof message === "string" ? message : message?.type;
    const destination = message?.destination;
    const safeDestination = destination === "/partner" || destination === "/admin/users" || destination === "/login"
      ? destination : undefined;
    if (type === "session-changed") {
      setAccessToken(null);
      clearOrganizationScope();
      onSessionChanged?.(safeDestination);
      return;
    }
    if (type !== "logout") return;
    if (getAccessToken()) setAccessToken(null);
    clearOrganizationScope();
  };
  return () => channel.close();
}
