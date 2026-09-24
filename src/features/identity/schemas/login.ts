import { z } from "zod";

// Mirrors the backend LoginRequest bounds; the server re-validates regardless.
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address")
    .max(320)
    .pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Enter your password").max(1024),
});

export type LoginValues = z.infer<typeof loginSchema>;
