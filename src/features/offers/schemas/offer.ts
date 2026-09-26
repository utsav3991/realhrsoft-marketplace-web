import { z } from "zod";

import type { Schemas } from "@/shared/api";
import { fromDateTimeLocal, toDateTimeLocal } from "@/shared/lib/format";

import type { Offer, RedemptionMethod } from "../api/queries";

// Mirrors the Django offer serializers and services; the server re-validates.
const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, `At most ${max} characters`);
const optionalText = (max: number) => z.string().trim().max(max, `At most ${max} characters`);

export const REDEMPTION_METHODS: readonly { value: RedemptionMethod; label: string }[] = [
  { value: "promo_code", label: "Promo code" },
  { value: "qr_code", label: "QR code" },
  { value: "booking_link", label: "Booking / external link" },
  { value: "show_employee_id", label: "Show employee ID" },
  { value: "in_store", label: "In-store verification" },
  { value: "custom", label: "Custom" },
];

export const REDEMPTION_LABEL = Object.fromEntries(
  REDEMPTION_METHODS.map(({ value, label }) => [value, label]),
) as Record<RedemptionMethod, string>;

/** Which optional redemption fields each method uses; the API stores the others empty. */
export const METHOD_FIELDS: Record<
  RedemptionMethod,
  readonly ("redemptionCode" | "redemptionUrl" | "redemptionInstructions" | "customMethodName")[]
> = {
  promo_code: ["redemptionCode"],
  qr_code: ["redemptionCode"],
  booking_link: ["redemptionUrl"],
  show_employee_id: ["redemptionInstructions"],
  in_store: ["redemptionInstructions"],
  custom: ["customMethodName", "redemptionInstructions"],
};

const PROMO_CODE = /^[A-Za-z0-9_-]{3,64}$/;
const HTTPS_URL = /^https:\/\/[^\s/$.?#][^\s]*$/;

/** Offer audiences a partner offer may use. Own Employees is a Company Benefit, not an offer. */
export type OfferAudience = "all_eligible_users" | "selected_organizations";

export const AUDIENCE_LABEL: Record<Offer["audience_type"], string> = {
  all_eligible_users: "All eligible users",
  selected_organizations: "Selected organizations",
  specific_user_groups: "Specific user groups",
};

export interface AudienceOrganization {
  id: string;
  name: string;
}

export const offerSchema = z
  .object({
    categoryId: z.string().min(1, "Choose a category"),
    title: requiredText(150, "Enter a title"),
    benefit: requiredText(255, "Enter the benefit headline"),
    description: requiredText(4000, "Describe the offer"),
    terms: requiredText(4000, "Enter the terms and conditions"),
    validFrom: z.string().min(1, "Choose when the offer starts"),
    validUntil: z.string().min(1, "Choose when the offer ends"),
    redemptionMethod: z.enum([
      "promo_code",
      "qr_code",
      "booking_link",
      "show_employee_id",
      "in_store",
      "custom",
    ]),
    redemptionCode: optionalText(255),
    redemptionUrl: optionalText(500),
    redemptionInstructions: optionalText(2000),
    customMethodName: optionalText(100),
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
    switch (values.redemptionMethod) {
      case "promo_code":
        if (!PROMO_CODE.test(values.redemptionCode))
          issue("redemptionCode", "Use 3-64 letters, digits, hyphens or underscores");
        break;
      case "qr_code":
        if (!values.redemptionCode) issue("redemptionCode", "Enter the value the QR code encodes");
        break;
      case "booking_link":
        if (!HTTPS_URL.test(values.redemptionUrl))
          issue("redemptionUrl", "Enter a link starting with https://");
        break;
      case "custom":
        if (!values.customMethodName) issue("customMethodName", "Name the redemption method");
        if (!values.redemptionInstructions)
          issue("redemptionInstructions", "Explain how employees redeem it");
        break;
      case "in_store":
        if (!values.redemptionInstructions)
          issue("redemptionInstructions", "Explain how employees redeem it");
        break;
      case "show_employee_id":
        break;
    }
    if (values.audienceType === "selected_organizations" && values.audienceOrganizations.length === 0)
      issue("audienceOrganizations", "Choose at least one organization");
  });
export type OfferValues = z.infer<typeof offerSchema>;

export const EMPTY_OFFER: OfferValues = {
  categoryId: "",
  title: "",
  benefit: "",
  description: "",
  terms: "",
  validFrom: "",
  validUntil: "",
  redemptionMethod: "promo_code",
  redemptionCode: "",
  redemptionUrl: "",
  redemptionInstructions: "",
  customMethodName: "",
  audienceType: "all_eligible_users",
  audienceOrganizations: [],
  reason: "",
};

/** Request body field → form field, for placing 422 errors. */
export const OFFER_FIELDS = {
  category_id: "categoryId",
  title: "title",
  benefit: "benefit",
  description: "description",
  terms: "terms",
  valid_from: "validFrom",
  valid_until: "validUntil",
  redemption_method: "redemptionMethod",
  redemption_code: "redemptionCode",
  redemption_url: "redemptionUrl",
  redemption_instructions: "redemptionInstructions",
  custom_method_name: "customMethodName",
  audience_type: "audienceType",
  audience_organization_ids: "audienceOrganizations",
  reason: "reason",
} as const;

export type OfferContentBody = Omit<Schemas["OfferInput"], "intent">;

/**
 * PUT semantics: every field is sent. Fields the chosen method does not use are sent empty,
 * as the API would store them.
 */
export function offerBody(values: OfferValues): OfferContentBody {
  const used = METHOD_FIELDS[values.redemptionMethod];
  const field = (name: (typeof used)[number]) => (used.includes(name) ? values[name] : "");
  const selected = values.audienceType === "selected_organizations";
  return {
    category_id: values.categoryId,
    title: values.title,
    benefit: values.benefit,
    description: values.description,
    terms: values.terms,
    valid_from: fromDateTimeLocal(values.validFrom) ?? "",
    valid_until: fromDateTimeLocal(values.validUntil) ?? "",
    redemption_method: values.redemptionMethod,
    redemption_code: field("redemptionCode"),
    redemption_url: field("redemptionUrl"),
    redemption_instructions: field("redemptionInstructions"),
    custom_method_name: field("customMethodName"),
    audience_type: values.audienceType,
    audience_organization_ids: selected ? values.audienceOrganizations.map((o) => o.id) : [],
    reason: values.reason,
  };
}

export function offerValues(offer: Offer): OfferValues {
  return {
    categoryId: offer.category.id,
    title: offer.title,
    benefit: offer.benefit,
    description: offer.description,
    terms: offer.terms,
    validFrom: toDateTimeLocal(offer.valid_from),
    validUntil: toDateTimeLocal(offer.valid_until),
    redemptionMethod: offer.redemption_method,
    redemptionCode: offer.redemption_code ?? "",
    redemptionUrl: offer.redemption_url ?? "",
    redemptionInstructions: offer.redemption_instructions ?? "",
    customMethodName: offer.custom_method_name ?? "",
    // specific_user_groups is not accepted yet, so an offer can never carry it.
    audienceType:
      offer.audience_type === "selected_organizations"
        ? "selected_organizations"
        : "all_eligible_users",
    audienceOrganizations: offer.audience_organizations.map(({ id, name }) => ({ id, name })),
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
