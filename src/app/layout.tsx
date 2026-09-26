import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import { connection } from "next/server";
import type { ReactNode } from "react";

import "@/design-system/styles/globals.css";

import { Providers } from "./providers";

// Self-hosted at build time, so the CSP's font-src 'self' still holds.
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const code = JetBrains_Mono({ subsets: ["latin"], variable: "--font-code" });

export const metadata: Metadata = {
  title: { default: "RealHRsoft Marketplace", template: "%s · RealHRsoft Marketplace" },
  description: "Employee offers, partner campaigns and company benefits.",
};

/** The nonce src/proxy.ts put in this request's CSP, for the theme script next-themes injects. */
async function cspNonce(): Promise<string | undefined> {
  const policy = (await headers()).get("content-security-policy") ?? "";
  return /'nonce-([^']+)'/.exec(policy)?.[1];
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Render per request so Next.js can stamp each response's CSP nonce on its scripts
  // (src/proxy.ts). A prerendered page would carry no nonce and its scripts would be blocked.
  await connection();
  const nonce = await cspNonce();
  return (
    // next-themes sets the theme class on <html> before hydration.
    <html lang="en" className={`${body.variable} ${code.variable}`} suppressHydrationWarning>
      {/* Extensions (ColorZilla, Grammarly, …) add attributes to <body> before hydration.
          This silences only attribute mismatches on this element, not its children. */}
      <body className="min-h-dvh font-sans" suppressHydrationWarning>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
