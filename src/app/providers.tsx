"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { Toaster } from "@/design-system/primitives/sonner";
import { makeQueryClient } from "@/shared/api";
import { SessionProvider } from "@/shared/auth";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
