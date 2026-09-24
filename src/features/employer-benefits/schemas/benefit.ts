import { z } from "zod";

import type { Schemas } from "@/shared/api";
import { fromDateTimeLocal, toDateTimeLocal } from "@/shared/lib/format";

// Mirrors the backend bounds; the server re-validates. The audience is always the
// organization's own employees, so it is not part of the form.
export const benefitSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a title").max(150),
    description: z.string().trim().min(1, "Describe the benefit").max(4000),
    terms: z.string().trim().max(4000),
    validFrom: z.string(),
    validUntil: z.string(),
    usageLimit: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || (/^\d+$/.test(value) && +value >= 1 && +value <= 10_000),
        "Enter a whole number from 1 to 10000, or leave empty",
      ),
  })
  .refine(
    (values) =>
      !values.validFrom ||
      !values.validUntil ||
      new Date(values.validUntil) > new Date(values.validFrom),
    { path: ["validUntil"], message: "The end must be after the start" },
  );
export type BenefitValues = z.infer<typeof benefitSchema>;

export const EMPTY_BENEFIT: BenefitValues = {
  title: "",
  description: "",
  terms: "",
  validFrom: "",
  validUntil: "",
  usageLimit: "",
};

export function benefitBody(values: BenefitValues): Schemas["BenefitBody"] {
  return {
    title: values.title,
    description: values.description,
    terms: values.terms || null,
    valid_from: fromDateTimeLocal(values.validFrom),
    valid_until: fromDateTimeLocal(values.validUntil),
    usage_limit_per_employee: values.usageLimit ? Number(values.usageLimit) : null,
  };
}

export function benefitValues(benefit: Schemas["BenefitResponse"]): BenefitValues {
  return {
    title: benefit.title,
    description: benefit.description,
    terms: benefit.terms ?? "",
    validFrom: toDateTimeLocal(benefit.valid_from),
    validUntil: toDateTimeLocal(benefit.valid_until),
    usageLimit: benefit.usage_limit_per_employee?.toString() ?? "",
  };
}

export const BENEFIT_FIELDS = {
  title: "title",
  description: "description",
  terms: "terms",
  valid_from: "validFrom",
  valid_until: "validUntil",
  usage_limit_per_employee: "usageLimit",
} as const;
