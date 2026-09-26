import { z } from "zod";

// Every governance decision carries an audited reason. Mirrors the backend bounds (1–500);
// the server re-validates regardless.
export const reasonSchema = z
  .string()
  .trim()
  .min(1, "Give a reason; it is kept in the audit log")
  .max(500, "Keep the reason under 500 characters");

export const reasonFormSchema = z.object({ reason: reasonSchema });

/** An optional audit note, for decisions the backend records without a reason. */
export const noteFormSchema = z.object({
  reason: z.string().trim().max(500, "Keep the note under 500 characters"),
});
export type ReasonValues = z.infer<typeof reasonFormSchema>;
