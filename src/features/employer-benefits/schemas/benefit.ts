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
    // A company's benefit is always own_organization; a client's is every company of the
    // client (including later ones) or the selected companies.
    audienceType: z.enum([
      "own_organization",
      "all_client_organizations",
      "selected_organizations",
    ]),
    audienceOrganizations: z
      .array(z.object({ id: z.string(), name: z.string() }))
      .max(200, "Choose at most 200 companies"),
    reason: z.string().trim().max(500, "Keep the note under 500 characters"),
  })
  .superRefine((values, ctx) => {
    if (values.validFrom && values.validUntil && values.validUntil <= values.validFrom) {
      ctx.addIssue({ code: "custom", path: ["validUntil"], message: "End after the start" });
    }
    if (
      values.audienceType === "selected_organizations" &&
      values.audienceOrganizations.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["audienceOrganizations"],
        message: "Choose at least one company",
      });
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
  audienceType: "own_organization",
  audienceOrganizations: [],
  reason: "",
};

/** A new client benefit starts for every company of the client, including later ones. */
export const EMPTY_CLIENT_BENEFIT: BenefitValues = {
  ...EMPTY_BENEFIT,
  audienceType: "all_client_organizations",
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
  audience_type: "audienceType",
  audience_organization_ids: "audienceOrganizations",
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

export type ClientBenefitContentBody = Omit<Schemas["ClientBenefitContent"], "intent">;

/** A client benefit also sends its audience: every company, or the selected ones. */
export function clientBenefitBody(values: BenefitValues): ClientBenefitContentBody {
  const selected = values.audienceType === "selected_organizations";
  return {
    ...benefitBody(values),
    audience_type: selected ? "selected_organizations" : "all_client_organizations",
    audience_organization_ids: selected ? values.audienceOrganizations.map((o) => o.id) : [],
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
    audienceType: policy.audience_type,
    audienceOrganizations: policy.audience_organizations.map(({ id, name }) => ({ id, name })),
    reason: "",
  };
}
