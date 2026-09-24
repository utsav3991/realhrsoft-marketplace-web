/**
 * The organization the actor is acting for, sent as X-Organization-ID on every request.
 * The backend accepts only scopes assigned to the user and answers 403 otherwise.
 * Kept per tab (sessionStorage) so two tabs can work in different organizations.
 */
type Listener = () => void;

const STORAGE_KEY = "marketplace.activeOrganizationId";
const listeners = new Set<Listener>();
let activeOrganizationId: string | null | undefined;

function read(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getActiveOrganizationId(): string | null {
  if (activeOrganizationId === undefined) {
    activeOrganizationId = typeof window === "undefined" ? null : read();
  }
  return activeOrganizationId;
}

export function setActiveOrganizationId(organizationId: string | null): void {
  if (organizationId === getActiveOrganizationId()) return;
  activeOrganizationId = organizationId;
  try {
    if (organizationId) window.sessionStorage.setItem(STORAGE_KEY, organizationId);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode, blocked): the selection still holds for this page.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeActiveOrganization(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
