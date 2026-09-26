import { z } from "zod";

// The partner's counter. Mirrors redemptions/api/v1/serializers.py; the server re-validates.

/** The voucher reference alphabet: no 0/O or 1/I/L, so it reads and types unambiguously. */
const REFERENCE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/;

const saleReference = z.string().trim().max(100, "At most 100 characters");

/** What a scanner (typing like a keyboard) or a paste puts in the QR field. */
export const scanFormSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, "Scan the customer's QR code")
    .max(200, "This is not a voucher QR code"),
});
export type ScanValues = z.infer<typeof scanFormSchema>;

export const saleFormSchema = z.object({ saleReference });
export type SaleValues = z.infer<typeof saleFormSchema>;

/** Upper-cased, without the spaces or dashes a cashier may type while reading it out. */
export function normalizeReference(value: string): string {
  return value.toUpperCase().replace(/[\s-]/g, "");
}

export const referenceFormSchema = z.object({
  voucherReference: z
    .string()
    .refine(
      (value) => REFERENCE.test(normalizeReference(value)),
      "Enter the 10-character code under the QR",
    ),
  saleReference,
});
export type ReferenceValues = z.infer<typeof referenceFormSchema>;
