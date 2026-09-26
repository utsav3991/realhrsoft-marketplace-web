import { z } from "zod";

import {
  BENEFIT_VALUE_FIELDS,
  benefitValueBody,
  benefitValueSchema,
  benefitValueValues,
  EMPTY_BENEFIT_VALUE,
} from "@/features/offers/schemas/benefit-value";
import type { Schemas } from "@/shared/api";
import { fromDateTimeLocal, toDateTimeLocal } from "@/shared/lib/format";

import type { Benefit } from "../api/queries";

// Mirrors the Django benefit serializer and offers/terms.py; the server re-validates.
export const MAX_CLAIMS_PER_EMPLOYEE = 1000;

const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, `At most ${max} characters`);
const optionalText = (max: number) => z.string().trim().max(max, `At most ${max} characters`);

export const benefitSchema = z
  .object({
    title: requiredText(150, "Enter a title"),
    headline: requiredText(255, "Enter the card headline"),
    benefit: benefitValueSchema,
    description: requiredText(4000, "Describe the benefit"),
    usageRules: optionalText(4000),
    terms: optionalText(4000),
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

// The editor starts the limit at one use and the value as words; they are form values, not
// server defaults.
export const EMPTY_BENEFIT: BenefitValues = {
  title: "",
  headline: "",
  benefit: { ...EMPTY_BENEFIT_VALUE, type: "descriptive" },
  description: "",
  usageRules: "",
  terms: "",
  validFrom: "",
  validUntil: "",
  maxClaims: "1",
  reason: "",
};

/** Request body field → form field, for placing 422 errors. */
export const BENEFIT_FIELDS = {
  title: "title",
  headline: "headline",
  ...BENEFIT_VALUE_FIELDS,
  description: "description",
  usage_rules: "usageRules",
  terms: "terms",
  valid_from: "validFrom",
  valid_until: "validUntil",
  max_claims_per_beneficiary: "maxClaims",
  reason: "reason",
} as const;

export type BenefitContentBody = Omit<Schemas["BenefitContent"], "intent">;

/** PUT semantics: every field is sent; an empty end date makes the benefit open-ended. */
export function benefitBody(values: BenefitValues): BenefitContentBody {
  return {
    title: values.title,
    headline: values.headline,
    benefit: benefitValueBody(values.benefit),
    description: values.description,
    usage_rules: values.usageRules,
    terms: values.terms,
    valid_from: fromDateTimeLocal(values.validFrom) ?? "",
    valid_until: values.validUntil ? fromDateTimeLocal(values.validUntil) : null,
    max_claims_per_beneficiary: Number(values.maxClaims),
    reason: values.reason,
  };
}

/** The terms an edit starts from: the live version, else the unpublished draft. */
export function benefitVersion(benefit: Benefit) {
  return benefit.current_version ?? benefit.working_version;
}

export function benefitValues(benefit: Benefit): BenefitValues {
  const version = benefitVersion(benefit);
  const policy = version?.benefit_policy;
  if (!version || !policy) return EMPTY_BENEFIT;
  return {
    title: version.title,
    headline: version.headline,
    benefit: benefitValueValues(version.benefit),
    description: version.description,
    usageRules: policy.usage_rules,
    terms: version.terms ?? "",
    validFrom: toDateTimeLocal(version.valid_from),
    validUntil: toDateTimeLocal(version.valid_until),
    maxClaims: String(policy.max_claims_per_beneficiary),
    reason: "",
  };
}
