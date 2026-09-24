import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";

import "@/design-system/styles/globals.css";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "RealHRsoft Marketplace", template: "%s · RealHRsoft Marketplace" },
  description: "Employee offers, partner campaigns and company benefits.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Render per request so Next.js can stamp each response's CSP nonce on its scripts
  // (src/proxy.ts). A prerendered page would carry no nonce and its scripts would be blocked.
  await connection();
  return (
    <html lang="en">
      {/* Extensions (ColorZilla, Grammarly, …) add attributes to <body> before hydration.
          This silences only attribute mismatches on this element, not its children. */}
      <body className="min-h-dvh font-sans" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
