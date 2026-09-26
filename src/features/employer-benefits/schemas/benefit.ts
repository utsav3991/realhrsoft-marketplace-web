import { z } from "zod";

import type { Schemas } from "@/shared/api";
import { fromDateTimeLocal, toDateTimeLocal } from "@/shared/lib/format";

import type { Benefit } from "../api/queries";

// Mirrors the Django benefit serializer; the server re-validates.
export const MAX_CLAIMS_PER_EMPLOYEE = 1000;

const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, `At most ${max} characters`);

export const benefitSchema = z
  .object({
    title: requiredText(150, "Enter a title"),
    description: requiredText(4000, "Describe the benefit"),
    usageRules: z.string().trim().max(4000, "At most 4000 characters"),
    validFrom: z.string().min(1, "Choose when the benefit starts"),
    validUntil: z.string(),
    maxClaims: z
      .string()
      .trim()
      .refine(
        (value) =>
          /^\d{1,4}$/.test(value) && Number(value) >= 1 && Number(value) <= MAX_CLAIMS_PER_EMPLOYEE,
        `Use a whole number from 1 to ${MAX_CLAIMS_PER_EMPLOYEE}`,
      ),
    reason: z.string().trim().max(500, "Keep the note under 500 characters"),
  })
  .superRefine((values, ctx) => {
    if (values.validFrom && values.validUntil && values.validUntil <= values.validFrom) {
      ctx.addIssue({ code: "custom", path: ["validUntil"], message: "End after the start" });
    }
  });
export type BenefitValues = z.infer<typeof benefitSchema>;

// The editor starts the limit at one use; it is a form value, not a server default.
export const EMPTY_BENEFIT: BenefitValues = {
  title: "",
  description: "",
  usageRules: "",
  validFrom: "",
  validUntil: "",
  maxClaims: "1",
  reason: "",
};

/** Request body field → form field, for placing 422 errors. */
export const BENEFIT_FIELDS = {
  title: "title",
  description: "description",
  usage_rules: "usageRules",
  valid_from: "validFrom",
  valid_until: "validUntil",
  max_claims_per_employee: "maxClaims",
  reason: "reason",
} as const;

/** PUT semantics: every field is sent; an empty end date makes the benefit open-ended. */
export function benefitBody(values: BenefitValues): Schemas["BenefitInput"] {
  return {
    title: values.title,
    description: values.description,
    usage_rules: values.usageRules,
    valid_from: fromDateTimeLocal(values.validFrom) ?? "",
    valid_until: values.validUntil ? fromDateTimeLocal(values.validUntil) : null,
    max_claims_per_employee: Number(values.maxClaims),
    reason: values.reason,
  };
}

export function benefitValues(benefit: Benefit): BenefitValues {
  return {
    title: benefit.title,
    description: benefit.description,
    usageRules: benefit.usage_rules,
    validFrom: toDateTimeLocal(benefit.valid_from),
    validUntil: toDateTimeLocal(benefit.valid_until),
    maxClaims: String(benefit.max_claims_per_employee),
    reason: "",
  };
}
