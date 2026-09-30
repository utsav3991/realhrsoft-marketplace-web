import { z } from "zod";

import type { Schemas } from "@/shared/api";
import { fromDateTimeLocal, toDateTimeLocal } from "@/shared/lib/format";

import type { AcceptanceMode, Offer, OfferVersion, PresentationMethod } from "../api/queries";
import {
  BENEFIT_VALUE_FIELDS,
  benefitValueBody,
  benefitValueSchema,
  benefitValueValues,
  EMPTY_BENEFIT_VALUE,
} from "./benefit-value";

// Mirrors the Django offer serializers and offers/terms.py; the server re-validates.
export const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, `At most ${max} characters`);
export const optionalText = (max: number) => z.string().trim().max(max, `At most ${max} characters`);

export const PRESENTATION_METHODS: readonly { value: PresentationMethod; label: string }[] = [
  { value: "promo_code", label: "Promo code" },
  { value: "booking_link", label: "Booking / external link" },
  { value: "show_employee_id", label: "Show employee ID" },
  { value: "in_store", label: "In-store verification" },
  { value: "custom", label: "Custom" },
];

export const PRESENTATION_LABEL = Object.fromEntries(
  PRESENTATION_METHODS.map(({ value, label }) => [value, label]),
) as Record<PresentationMethod, string>;

/** The method's label; a custom method shows the partner's own name for it. */
export function presentationLabel(method: PresentationMethod, customName?: string | null): string {
  return method === "custom" && customName ? customName : PRESENTATION_LABEL[method];
}

type PresentationField = "promoCode" | "redemptionUrl" | "redemptionInstructions" | "customMethodName";

/** Which optional presentation fields each method uses; the API stores the others empty. */
export const METHOD_FIELDS: Record<PresentationMethod, readonly PresentationField[]> = {
  promo_code: ["promoCode", "redemptionInstructions"],
  booking_link: ["redemptionUrl", "redemptionInstructions"],
  show_employee_id: ["redemptionInstructions"],
  in_store: ["redemptionInstructions"],
  custom: ["customMethodName", "redemptionInstructions"],
};

/** Methods whose instructions are required; for the others they are optional. */
export const INSTRUCTION_METHODS: readonly PresentationMethod[] = ["in_store", "custom"];

export const ACCEPTANCE_LABEL: Record<AcceptanceMode, string> = {
  auto_accept: "Accepted automatically",
  partner_approval_required: "Partner approves each claim",
};

export const APPROVAL_TTL_HOURS = { min: 1, max: 720, default: 72 } as const;

const PROMO_CODE = /^[A-Z0-9_-]{3,64}$/;
/** Generated codes skip look-alikes (0/O, 1/I/L) so cashiers can read them back. */
const PROMO_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** Generated codes are opaque `XXXX-XXXX`; discount and validity live on the offer, not the code. */
const PROMO_CODE_GROUPS = 2;
const PROMO_CODE_GROUP_LENGTH = 4;
/** Bytes at or above this are rejected so every alphabet character is equally likely. */
const PROMO_CODE_BYTE_LIMIT = 256 - (256 % PROMO_CODE_ALPHABET.length);

function randomPromoCodeChars(count: number): string {
  let chars = "";
  while (chars.length < count) {
    for (const byte of crypto.getRandomValues(new Uint8Array(count))) {
      if (byte < PROMO_CODE_BYTE_LIMIT && chars.length < count)
        chars += PROMO_CODE_ALPHABET[byte % PROMO_CODE_ALPHABET.length];
    }
  }
  return chars;
}

/** A random opaque promo code such as `K7MP-4X9Q`. */
export function generatePromoCode(): string {
  return Array.from({ length: PROMO_CODE_GROUPS }, () =>
    randomPromoCodeChars(PROMO_CODE_GROUP_LENGTH),
  ).join("-");
}
const HTTPS_URL = /^https:\/\/[^\s/$.?#][^\s]*$/;

/** Offer audiences a partner offer may use. Own Employees is a Company Benefit, not an offer. */
export type OfferAudience = "all_eligible_users" | "selected_organizations";

export const AUDIENCE_LABEL: Record<Schemas["OfferAudienceTypeEnum"], string> = {
  all_eligible_users: "All eligible users",
  selected_organizations: "Selected organizations",
  specific_user_groups: "Specific user groups",
};

export const BUSINESS_AUDIENCE_LABEL: Record<Schemas["BusinessAudienceTypeEnum"], string> = {
  all_businesses: "All businesses",
  selected_organizations: "Selected organizations",
};

export interface AudienceOrganization {
  id: string;
  name: string;
}

/**
 * How employees apply the benefit and how their claims are accepted: a marketplace offer's
 * terms, and a business offer's employee terms when it is shown to employees.
 */
export const employeeTermsShape = {
  presentationMethod: z.enum(["promo_code", "booking_link", "show_employee_id", "in_store", "custom"]),
  promoCode: optionalText(64),
  redemptionUrl: optionalText(500),
  redemptionInstructions: optionalText(2000),
  customMethodName: optionalText(100),
  acceptanceMode: z.enum(["auto_accept", "partner_approval_required"]),
  approvalTtlHours: z.string().trim(),
};
export type EmployeeTermsValues = z.infer<z.ZodObject<typeof employeeTermsShape>>;

/** Cross-field rules of the employee terms, reported through `issue`. */
export function checkEmployeeTerms(
  values: EmployeeTermsValues,
  issue: (path: keyof EmployeeTermsValues, message: string) => void,
) {
  switch (values.presentationMethod) {
    case "promo_code":
      if (!PROMO_CODE.test(values.promoCode))
        issue("promoCode", "Use 3-64 upper case letters, digits, hyphens or underscores");
      break;
    case "booking_link":
      if (!HTTPS_URL.test(values.redemptionUrl))
        issue("redemptionUrl", "Enter a link starting with https://");
      break;
    case "custom":
      if (!values.customMethodName) issue("customMethodName", "Name the method");
      break;
    case "in_store":
    case "show_employee_id":
      break;
  }
  if (INSTRUCTION_METHODS.includes(values.presentationMethod) && !values.redemptionInstructions)
    issue("redemptionInstructions", "Explain how employees use it");
  if (values.acceptanceMode === "partner_approval_required") {
    const hours = Number(values.approvalTtlHours);
    if (
      !/^\d{1,3}$/.test(values.approvalTtlHours) ||
      hours < APPROVAL_TTL_HOURS.min ||
      hours > APPROVAL_TTL_HOURS.max
    )
      issue(
        "approvalTtlHours",
        `Use whole hours from ${APPROVAL_TTL_HOURS.min} to ${APPROVAL_TTL_HOURS.max}`,
      );
  }
}

export const EMPTY_EMPLOYEE_TERMS: EmployeeTermsValues = {
  presentationMethod: "promo_code",
  promoCode: "",
  redemptionUrl: "",
  redemptionInstructions: "",
  customMethodName: "",
  acceptanceMode: "auto_accept",
  approvalTtlHours: String(APPROVAL_TTL_HOURS.default),
};

/** Employee terms request field → form field, for placing 422 errors. */
export const EMPLOYEE_TERMS_FIELDS = {
  presentation_method: "presentationMethod",
  promo_code: "promoCode",
  redemption_url: "redemptionUrl",
  redemption_instructions: "redemptionInstructions",
  custom_method_name: "customMethodName",
  acceptance_mode: "acceptanceMode",
  approval_ttl_hours: "approvalTtlHours",
} as const;

/**
 * Fields the chosen method does not use are sent empty, as the API would store them; an
 * automatic acceptance sends no decision window.
 */
export function employeeTermsBody(values: EmployeeTermsValues): Schemas["EmployeeTermsInput"] {
  const used = METHOD_FIELDS[values.presentationMethod];
  const field = (name: PresentationField) => (used.includes(name) ? values[name] : "");
  return {
    presentation_method: values.presentationMethod,
    promo_code: field("promoCode"),
    redemption_url: field("redemptionUrl"),
    redemption_instructions: field("redemptionInstructions"),
    custom_method_name: field("customMethodName"),
    acceptance_mode: values.acceptanceMode,
    approval_ttl_hours:
      values.acceptanceMode === "partner_approval_required"
        ? Number(values.approvalTtlHours)
        : null,
  };
}

export function employeeTermsValues(
  policy: NonNullable<OfferVersion["marketplace_policy"]>,
): EmployeeTermsValues {
  return {
    presentationMethod: policy.presentation_method,
    promoCode: policy.promo_code,
    redemptionUrl: policy.redemption_url,
    redemptionInstructions: policy.redemption_instructions,
    customMethodName: policy.custom_method_name,
    acceptanceMode: policy.acceptance_mode,
    approvalTtlHours: String(policy.approval_ttl_hours ?? APPROVAL_TTL_HOURS.default),
  };
}

export const offerSchema = z
  .object({
    categoryId: z.string().min(1, "Choose a category"),
    title: requiredText(150, "Enter a title"),
    headline: requiredText(255, "Enter the card headline"),
    benefit: benefitValueSchema,
    description: requiredText(4000, "Describe the offer"),
    terms: optionalText(4000),
    validFrom: z.string().min(1, "Choose when the offer starts"),
    validUntil: z.string().min(1, "Choose when the offer ends"),
    ...employeeTermsShape,
    audienceType: z.enum(["all_eligible_users", "selected_organizations"]),
    audienceOrganizations: z
      .array(z.object({ id: z.string(), name: z.string() }))
      .max(200, "Choose at most 200 organizations"),
    reason: z.string().trim().max(500, "Keep the note under 500 characters"),
  })
  .superRefine((values, ctx) => {
    const issue = (path: keyof typeof values, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (values.validFrom && values.validUntil && values.validUntil <= values.validFrom) {
      issue("validUntil", "End after the start");
    }
    checkEmployeeTerms(values, issue);
    if (values.audienceType === "selected_organizations" && values.audienceOrganizations.length === 0)
      issue("audienceOrganizations", "Choose at least one organization");
  });
export type OfferValues = z.infer<typeof offerSchema>;

export const EMPTY_OFFER: OfferValues = {
  categoryId: "",
  title: "",
  headline: "",
  benefit: EMPTY_BENEFIT_VALUE,
  description: "",
  terms: "",
  validFrom: "",
  validUntil: "",
  ...EMPTY_EMPLOYEE_TERMS,
  audienceType: "all_eligible_users",
  audienceOrganizations: [],
  reason: "",
};

/** Request body field → form field, for placing 422 errors. */
export const OFFER_FIELDS = {
  category_id: "categoryId",
  title: "title",
  headline: "headline",
  ...BENEFIT_VALUE_FIELDS,
  description: "description",
  terms: "terms",
  valid_from: "validFrom",
  valid_until: "validUntil",
  ...EMPLOYEE_TERMS_FIELDS,
  audience_type: "audienceType",
  audience_organization_ids: "audienceOrganizations",
  reason: "reason",
} as const;

export type OfferContentBody = Omit<Schemas["OfferInput"], "intent">;

/** PUT semantics: every field is sent. */
export function offerBody(values: OfferValues): OfferContentBody {
  const selected = values.audienceType === "selected_organizations";
  return {
    category_id: values.categoryId,
    title: values.title,
    headline: values.headline,
    benefit: benefitValueBody(values.benefit),
    description: values.description,
    terms: values.terms,
    valid_from: fromDateTimeLocal(values.validFrom) ?? "",
    valid_until: fromDateTimeLocal(values.validUntil) ?? "",
    ...employeeTermsBody(values),
    audience_type: values.audienceType,
    audience_organization_ids: selected ? values.audienceOrganizations.map((o) => o.id) : [],
    reason: values.reason,
  };
}

/**
 * The terms an edit starts from: the working version (a draft, or a frozen one an edit copies
 * into a new draft), else the live one.
 */
export function editableVersion(offer: Offer): OfferVersion | null {
  return offer.working_version ?? offer.current_version;
}

export function offerValues(offer: Offer): OfferValues {
  const version = editableVersion(offer);
  const policy = version?.marketplace_policy;
  if (!version || !policy) return EMPTY_OFFER;
  return {
    categoryId: policy.category.id,
    title: version.title,
    headline: version.headline,
    benefit: benefitValueValues(version.benefit),
    description: version.description,
    terms: version.terms ?? "",
    validFrom: toDateTimeLocal(version.valid_from),
    validUntil: toDateTimeLocal(version.valid_until),
    ...employeeTermsValues(policy),
    // specific_user_groups is not accepted yet, so an offer can never carry it.
    audienceType:
      policy.audience_type === "selected_organizations"
        ? "selected_organizations"
        : "all_eligible_users",
    audienceOrganizations: policy.audience_organizations.map(({ id, name }) => ({ id, name })),
    reason: "",
  };
}

// --- Categories ------------------------------------------------------------------------

export const categorySchema = z.object({
  name: requiredText(100, "Enter a name"),
  slug: optionalText(120).refine(
    (value) => value === "" || /^[-a-zA-Z0-9_]+$/.test(value),
    "Use letters, digits, hyphens or underscores",
  ),
  description: optionalText(500),
  sortOrder: z
    .string()
    .trim()
    .refine((value) => /^\d{1,5}$/.test(value) && Number(value) <= 32767, "Use 0-32767"),
  reason: z.string().trim().max(500, "Keep the note under 500 characters"),
});
export type CategoryValues = z.infer<typeof categorySchema>;

export const EMPTY_CATEGORY: CategoryValues = {
  name: "",
  slug: "",
  description: "",
  sortOrder: "0",
  reason: "",
};

export const CATEGORY_FIELDS = {
  name: "name",
  slug: "slug",
  description: "description",
  sort_order: "sortOrder",
  reason: "reason",
} as const;

export function categoryBody(values: CategoryValues): Schemas["CategoryInput"] {
  return {
    name: values.name,
    slug: values.slug,
    description: values.description,
    sort_order: Number(values.sortOrder),
    reason: values.reason,
  };
}
