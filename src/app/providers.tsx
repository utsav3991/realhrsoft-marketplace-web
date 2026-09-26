"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";

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
          <SessionProvider>{children}</SessionProvider>
        </MotionConfig>
        <Toaster position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
