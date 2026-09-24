import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/design-system/styles/globals.css";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "RealHRsoft Marketplace", template: "%s · RealHRsoft Marketplace" },
  description: "Employee offers, partner campaigns and company benefits.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
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
