"use client";

import { ErrorState } from "@/shared/feedback/states";

export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <ErrorState error={error} onRetry={reset} />
    </main>
  );
}
