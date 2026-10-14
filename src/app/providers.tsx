"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";

import { ImpersonationBanner } from "@/features/identity/components/impersonation";
import { Toaster } from "@/design-system/primitives/sonner";
import { makeQueryClient } from "@/shared/api";
import { SessionProvider } from "@/shared/auth";

export function Providers({ nonce, children }: { nonce?: string; children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
    >
      <QueryClientProvider client={queryClient}>
        {/* "user": people who ask for reduced motion get fades without movement. */}
        <MotionConfig reducedMotion="user">
          <SessionProvider>
            {/* The banner owns its row; portal chrome uses the remaining viewport. */}
            <div className="grid h-dvh grid-rows-[auto_minmax(0,1fr)]">
              <div>
                <ImpersonationBanner />
              </div>
              <div className="[container-type:size] overflow-auto" data-slot="application-content">
                {children}
              </div>
            </div>
          </SessionProvider>
        </MotionConfig>
        <Toaster position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
