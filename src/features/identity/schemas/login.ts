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

// The backend applies Django's password validators; this only checks the two fields match.
export const setPasswordSchema = z
  .object({
    password: z.string().min(1, "Enter a password").max(1024),
    confirm_password: z.string().min(1, "Repeat the password"),
  })
  .refine((values) => values.password === values.confirm_password, {
    path: ["confirm_password"],
    message: "The passwords do not match",
  });

export type SetPasswordValues = z.infer<typeof setPasswordSchema>;
