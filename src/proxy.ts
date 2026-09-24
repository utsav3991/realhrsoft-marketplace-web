import { NextResponse, type NextRequest } from "next/server";

/**
 * Per-request Content Security Policy (OWASP ASVS V14.4, Next.js strict-CSP guide).
 *
 * Scripts run only with this request's nonce ('strict-dynamic' extends trust to the chunks
 * they load), so injected markup cannot execute script and reach the in-memory access token.
 * Styles allow 'unsafe-inline': Radix positions popovers with style attributes and sonner
 * injects a <style> tag at runtime, neither of which can carry a nonce. Style injection is
 * far less dangerous than script injection, and connect-src still limits exfiltration.
 */
function contentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // React needs eval in development only, for its error overlays.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    // Same origin only: the API is proxied or routed under /api (ADR-013).
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const policy = contentSecurityPolicy(nonce);

  // Next.js reads the nonce from the request's CSP header and applies it to its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Documents only: API responses, static assets and prefetches need no CSP.
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
