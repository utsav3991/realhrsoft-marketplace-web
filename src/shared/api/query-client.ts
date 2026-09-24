import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "./errors";

function shouldRetry(failureCount: number, error: unknown): boolean {
  // 4xx answers are decisions, not glitches: retrying cannot change them.
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetry },
      mutations: { retry: false },
    },
  });
}
