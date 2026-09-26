import { useMemo, useRef } from "react";

import { ApiError } from "@/shared/api";

/**
 * Whether the server answered, so the attempt definitely did not commit. A network failure or
 * a 5xx leaves the outcome unknown: the retry must reuse the key to replay, not repeat, it.
 */
export function isDefiniteFailure(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}

/**
 * One Idempotency-Key per attempt of a command. `run` reuses the key while the previous
 * attempt's outcome is unknown and starts a new one after a success or a definite refusal, so
 * editing the form after a 409 or 422 never trips IDEMPOTENCY_KEY_REUSED.
 */
export function useIdempotencyKey() {
  const key = useRef<string | null>(null);
  return useMemo(
    () => ({
      async run<T>(send: (idempotencyKey: string) => Promise<T>): Promise<T> {
        key.current ??= crypto.randomUUID();
        try {
          const result = await send(key.current);
          key.current = null;
          return result;
        } catch (error) {
          if (isDefiniteFailure(error)) key.current = null;
          throw error;
        }
      },
      /** The key of the attempt whose outcome is unknown, to look its result up. */
      pending(): string | null {
        return key.current;
      },
      /** A new attempt, e.g. when a dialog opens again for another command. */
      reset() {
        key.current = null;
      },
    }),
    [],
  );
}
