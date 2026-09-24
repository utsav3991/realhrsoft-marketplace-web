import { z } from "zod";

const schema = z.object({
  // Same-origin only: the refresh cookie and Origin check do not work cross-origin (ADR-013).
  apiBasePath: z
    .string()
    .regex(/^\/[^/]/, "NEXT_PUBLIC_API_BASE_PATH must be a same-origin path such as /api/v1"),
  appEnv: z.enum(["local", "test", "staging", "production"]),
});

// NEXT_PUBLIC_* values are inlined at build time, so each must be referenced literally.
export const env = schema.parse({
  apiBasePath: process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/v1",
  appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? "local",
});
