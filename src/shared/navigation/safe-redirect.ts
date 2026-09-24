/**
 * Accepts only same-origin, absolute paths for post-login redirects (?next=). Anything that
 * could leave the site ("//evil.com", "/\\evil.com", "https://…") is rejected.
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  try {
    const url = new URL(value, "http://marketplace.invalid");
    if (url.origin !== "http://marketplace.invalid") return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function loginPath(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}
