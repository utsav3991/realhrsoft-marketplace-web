/**
 * The client (a RealHRSoft group: a Partner and all its companies) the actor is acting for,
 * sent as X-Client-ID on client-scoped requests only (see `isClientScoped`). The backend
 * accepts only a client where the user is a current verified member holding a client role,
 * and answers 403 otherwise. Kept per tab (sessionStorage), like the organization.
 */
type Listener = () => void;

const STORAGE_KEY = "marketplace.activeClientId";
const listeners = new Set<Listener>();
let activeClientId: string | null | undefined;

function read(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getActiveClientId(): string | null {
  if (activeClientId === undefined) {
    activeClientId = typeof window === "undefined" ? null : read();
  }
  return activeClientId;
}

export function setActiveClientId(clientId: string | null): void {
  if (clientId === getActiveClientId()) return;
  activeClientId = clientId;
  try {
    if (clientId) window.sessionStorage.setItem(STORAGE_KEY, clientId);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode, blocked): the selection still holds for this page.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeActiveClient(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Paths whose handlers act inside the selected client (the Client portal), plus /auth/me
 * (which reports the client grants held there). Nothing else is client-scoped.
 */
export function isClientScoped(path: string): boolean {
  return path === "/auth/me" || path.startsWith("/client/");
}

// Clients the API refused for this actor; not selected automatically again.
const denied = new Set<string>();

export function markClientDenied(clientId: string): void {
  denied.add(clientId);
  listeners.forEach((listener) => listener());
}

export function isClientDenied(clientId: string): boolean {
  return denied.has(clientId);
}

export function clearDeniedClients(): void {
  denied.clear();
}
