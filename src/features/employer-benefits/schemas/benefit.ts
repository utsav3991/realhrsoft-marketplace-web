import { z } from "zod";

import type { Schemas } from "@/shared/api";
import { fromDateTimeLocal, toDateTimeLocal } from "@/shared/lib/format";

import type { BenefitType } from "../api/benefits";

export const BENEFIT_TYPES: readonly { value: BenefitType; label: string }[] = [
  { value: "health", label: "Health" },
  { value: "insurance", label: "Insurance" },
  { value: "wellness", label: "Wellness" },
  { value: "leave", label: "Leave" },
  { value: "financial", label: "Financial" },
  { value: "learning", label: "Learning" },
  { value: "travel", label: "Travel" },
  { value: "food", label: "Food" },
  { value: "other", label: "Other" },
];

export function benefitTypeLabel(value: string): string {
  return BENEFIT_TYPES.find((type) => type.value === value)?.label ?? value;
}

const TYPE_VALUES = BENEFIT_TYPES.map((type) => type.value) as [BenefitType, ...BenefitType[]];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^\+?[0-9 ()-]{5,30}$/;

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.host !== "" && !/\s/.test(value);
  } catch {
    return false;
  }
}

// Mirrors the backend bounds (ADR-014, ADR-015); the server re-validates. The audience is
// always the organization's own employees, so it is not part of the form.
export const benefitSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a title").max(150),
    benefitType: z.enum(TYPE_VALUES),
    description: z.string().trim().min(1, "Describe the benefit").max(4000),
    usageInstructions: z.string().trim().max(4000),
    terms: z.string().trim().max(4000),
    externalUrl: z
      .string()
      .trim()
      .max(2000)
      .refine((value) => value === "" || isHttpsUrl(value), "Enter a full https:// link"),
    validFrom: z.string(),
    validUntil: z.string(),
    usageLimit: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || (/^\d+$/.test(value) && +value >= 1 && +value <= 10_000),
        "Enter a whole number from 1 to 10000, or leave empty",
      ),
    contactName: z.string().trim().max(150),
    contactEmail: z
      .string()
      .trim()
      .max(254)
      .refine((value) => value === "" || EMAIL.test(value), "Enter a valid email address"),
    contactPhone: z
      .string()
      .trim()
      .max(30)
      .refine((value) => value === "" || PHONE.test(value), "Enter a valid phone number"),
  })
  .refine(
    (values) =>
      !values.validFrom ||
      !values.validUntil ||
      new Date(values.validUntil) > new Date(values.validFrom),
    { path: ["validUntil"], message: "The end must be after the start" },
  )
  .refine((values) => !values.contactName || values.contactEmail || values.contactPhone, {
    path: ["contactEmail"],
    message: "Add an email or a phone number for this contact",
  });
export type BenefitValues = z.infer<typeof benefitSchema>;

export const EMPTY_BENEFIT: BenefitValues = {
  title: "",
  benefitType: "other",
  description: "",
  usageInstructions: "",
  terms: "",
  externalUrl: "",
  validFrom: "",
  validUntil: "",
  usageLimit: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
};

export function benefitBody(values: BenefitValues): Schemas["BenefitBody"] {
  const hasContact = Boolean(values.contactName || values.contactEmail || values.contactPhone);
  return {
    title: values.title,
    benefit_type: values.benefitType,
    description: values.description,
    usage_instructions: values.usageInstructions || null,
    terms: values.terms || null,
    external_url: values.externalUrl || null,
    valid_from: fromDateTimeLocal(values.validFrom),
    valid_until: fromDateTimeLocal(values.validUntil),
    usage_limit_per_employee: values.usageLimit ? Number(values.usageLimit) : null,
    contact: hasContact
      ? {
          name: values.contactName || null,
          email: values.contactEmail || null,
          phone: values.contactPhone || null,
        }
      : null,
  };
}

function knownType(value: string): BenefitType {
  return TYPE_VALUES.find((type) => type === value) ?? "other";
}

export function benefitValues(benefit: Schemas["BenefitResponse"]): BenefitValues {
  return {
    title: benefit.title,
    benefitType: knownType(benefit.benefit_type),
    description: benefit.description,
    usageInstructions: benefit.usage_instructions ?? "",
    terms: benefit.terms ?? "",
    externalUrl: benefit.external_url ?? "",
    validFrom: toDateTimeLocal(benefit.valid_from),
    validUntil: toDateTimeLocal(benefit.valid_until),
    usageLimit: benefit.usage_limit_per_employee?.toString() ?? "",
    contactName: benefit.contact?.name ?? "",
    contactEmail: benefit.contact?.email ?? "",
    contactPhone: benefit.contact?.phone ?? "",
  };
}

/** API body field → form field, for placing 422 errors. Nested contact errors go to email. */
export const BENEFIT_FIELDS = {
  title: "title",
  benefit_type: "benefitType",
  description: "description",
  usage_instructions: "usageInstructions",
  terms: "terms",
  external_url: "externalUrl",
  valid_from: "validFrom",
  valid_until: "validUntil",
  usage_limit_per_employee: "usageLimit",
  contact: "contactEmail",
} as const;

// --- Options --------------------------------------------------------------------------------

export const optionSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(100),
  value: z.string().trim().max(100),
  description: z.string().trim().max(1000),
  sortOrder: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (/^\d+$/.test(value) && +value <= 1000),
      "Enter a whole number from 0 to 1000",
    ),
  isActive: z.boolean(),
});
export type OptionValues = z.infer<typeof optionSchema>;

export const EMPTY_OPTION: OptionValues = {
  name: "",
  value: "",
  description: "",
  sortOrder: "",
  isActive: true,
};

export type OptionFields = Omit<Schemas["AddOptionRequest"], "version">;

export function optionFields(values: OptionValues): OptionFields {
  return {
    name: values.name,
    value: values.value || null,
    description: values.description || null,
    sort_order: values.sortOrder ? Number(values.sortOrder) : 0,
  };
}

export function optionValues(option: Schemas["OptionResponse"]): OptionValues {
  return {
    name: option.name,
    value: option.value ?? "",
    description: option.description ?? "",
    sortOrder: String(option.sort_order),
    isActive: option.is_active,
  };
}

export const OPTION_FIELDS = {
  name: "name",
  value: "value",
  description: "description",
  sort_order: "sortOrder",
  is_active: "isActive",
} as const;
