import { z } from "zod";

// Every governance decision carries an audited reason. Mirrors the backend bounds (1–500);
// the server re-validates regardless.
export const reasonSchema = z
  .string()
  .trim()
  .min(1, "Give a reason; it is kept in the audit log")
  .max(500, "Keep the reason under 500 characters");

export const reasonFormSchema = z.object({ reason: reasonSchema });
export type ReasonValues = z.infer<typeof reasonFormSchema>;
