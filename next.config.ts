import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// The browser must reach the Django API on this app's own origin: its refresh cookie is
// SameSite=Strict and scoped to {FORCE_SCRIPT_NAME}/api/v1/auth, and refresh/logout check the
// Origin against DJANGO_TRUSTED_ORIGINS. In local development Next proxies /api/* to Django
// (FORCE_SCRIPT_NAME unset); deployed, Nginx serves Django under /backend on the same origin
// (NEXT_PUBLIC_API_BASE_PATH=/backend/api/v1) and this is unset.
const apiProxyTarget = process.env.API_PROXY_TARGET;

// The Content-Security-Policy is per request (it carries a script nonce): see src/proxy.ts.
const securityHeaders = [
  // Nothing in this app is meant to be framed. Revisit with ADR-013 if RealHRsoft embeds
  // /marketplace, because that needs a per-environment frame-ancestors allow-list.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Isolates this window from cross-origin openers and popups.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // Browsers ignore HSTS over plain http, so it is harmless locally; deployments are https-only.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // Preserve Django endpoint slashes when proxying POSTs (including password setup).
  skipTrailingSlashRedirect: true,
  // Pin the workspace root: a stray lockfile in a parent directory must not be picked up.
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    if (!apiProxyTarget) return [];
    return [
      // Wildcard parameters exclude the final slash; preserve it explicitly before
      // matching slashless endpoints (Django's API uses both URL forms).
      { source: "/api/:path*/", destination: `${apiProxyTarget}/api/:path*/` },
      { source: "/api/:path*", destination: `${apiProxyTarget}/api/:path*` },
    ];
  },
};

export default nextConfig;
