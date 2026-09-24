/**
 * The access token lives only in memory (ADR-013): never in localStorage, sessionStorage or a
 * readable cookie. A page reload recovers it through the httpOnly refresh cookie.
 */
type Listener = () => void;

let accessToken: string | null = null;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  if (token === accessToken) return;
  accessToken = token;
  listeners.forEach((listener) => listener());
}

export function subscribeAccessToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
