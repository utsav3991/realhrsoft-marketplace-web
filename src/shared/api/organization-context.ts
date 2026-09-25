/**
 * The organization the actor is acting for, sent as X-Organization-ID on organization-scoped
 * requests only (see `isOrganizationScoped`). The backend accepts only an organization where the
 * user is a verified member holding a grant, and answers 403 otherwise (ADR-014).
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

/**
 * Paths whose handlers act inside the selected organization, plus /auth/me (which reports the
 * grants held there). Partner self-service registration is organization-scoped too: an
 * organization registers itself (POST /partner/me). Administration is never
 * organization-scoped: sending the header there would only make the backend demand a
 * membership it does not need.
 */
export function isOrganizationScoped(path: string): boolean {
  return path === "/auth/me" || path.startsWith("/employer/") || path.startsWith("/partner/");
}

// Organizations the API refused for this actor (member without any grant there). They are not
// selected automatically again, which would loop between selecting and being refused.
const denied = new Set<string>();

export function markOrganizationDenied(organizationId: string): void {
  denied.add(organizationId);
  listeners.forEach((listener) => listener());
}

export function isOrganizationDenied(organizationId: string): boolean {
  return denied.has(organizationId);
}

/** Forget refusals, e.g. after signing in again or after grants change. */
export function clearDeniedOrganizations(): void {
  denied.clear();
}
