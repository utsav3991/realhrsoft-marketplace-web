import { z } from "zod";

import type { Offer } from "@/features/offers/api/queries";
import {
  BENEFIT_VALUE_FIELDS,
  benefitValueBody,
  benefitValueSchema,
  benefitValueValues,
  EMPTY_BENEFIT_VALUE,
} from "@/features/offers/schemas/benefit-value";
import {
  checkEmployeeTerms,
  editableVersion,
  EMPLOYEE_TERMS_FIELDS,
  employeeTermsBody,
  employeeTermsShape,
  employeeTermsValues,
  EMPTY_EMPLOYEE_TERMS,
  optionalText,
  requiredText,
} from "@/features/offers/schemas/offer";
import type { Schemas } from "@/shared/api";
import { fromDateTimeLocal, toDateTimeLocal } from "@/shared/lib/format";

// Mirrors the Django business offer serializers and offers/terms.py; the server re-validates.
export const businessOfferSchema = z
  .object({
    categoryId: z.string().min(1, "Choose a category"),
    title: requiredText(150, "Enter a title"),
    headline: requiredText(255, "Enter the card headline"),
    benefit: benefitValueSchema,
    description: requiredText(4000, "Describe the offer"),
    terms: optionalText(4000),
    validFrom: z.string().min(1, "Choose when the offer starts"),
    /** Optional (open-ended) unless employees see it: their vouchers expire then. */
    validUntil: z.string(),
    audienceType: z.enum(["all_businesses", "selected_businesses"]),
    /** The selected businesses (merchants or client groups); the shared audience field. */
    audienceOrganizations: z
      .array(z.object({ id: z.string(), name: z.string() }))
      .max(200, "Choose at most 200 businesses"),
    enquiryInstructions: optionalText(2000),
    /** The employee switch; the employee terms below apply only while it is on. */
    showToEmployees: z.boolean(),
    ...employeeTermsShape,
    reason: z.string().trim().max(500, "Keep the note under 500 characters"),
  })
  .superRefine((values, ctx) => {
    const issue = (path: keyof typeof values, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (values.validFrom && values.validUntil && values.validUntil <= values.validFrom)
      issue("validUntil", "End after the start");
    if (values.audienceType === "selected_businesses" && values.audienceOrganizations.length === 0)
      issue("audienceOrganizations", "Choose at least one business");
    if (values.showToEmployees) {
      if (!values.validUntil)
        issue("validUntil", "Choose an end date: employees' vouchers expire then");
      checkEmployeeTerms(values, issue);
    }
  });
export type BusinessOfferValues = z.infer<typeof businessOfferSchema>;

export const EMPTY_BUSINESS_OFFER: BusinessOfferValues = {
  categoryId: "",
  title: "",
  headline: "",
  benefit: EMPTY_BENEFIT_VALUE,
  description: "",
  terms: "",
  validFrom: "",
  validUntil: "",
  audienceType: "all_businesses",
  audienceOrganizations: [],
  enquiryInstructions: "",
  showToEmployees: false,
  ...EMPTY_EMPLOYEE_TERMS,
  reason: "",
};

/** The employee terms arrive nested under employee_terms in 422 errors. */
const NESTED_EMPLOYEE_FIELDS = Object.fromEntries(
  Object.entries(EMPLOYEE_TERMS_FIELDS).map(([api, form]) => [`employee_terms.${api}`, form]),
) as Record<
  `employee_terms.${keyof typeof EMPLOYEE_TERMS_FIELDS}`,
  keyof typeof EMPTY_EMPLOYEE_TERMS
>;

/** Request body field → form field, for placing 422 errors. */
export const BUSINESS_OFFER_FIELDS = {
  category_id: "categoryId",
  title: "title",
  headline: "headline",
  ...BENEFIT_VALUE_FIELDS,
  description: "description",
  terms: "terms",
  valid_from: "validFrom",
  valid_until: "validUntil",
  audience_type: "audienceType",
  audience_business_ids: "audienceOrganizations",
  enquiry_instructions: "enquiryInstructions",
  show_to_employees: "showToEmployees",
  ...NESTED_EMPLOYEE_FIELDS,
  employee_terms: "showToEmployees",
  reason: "reason",
} as const;

export type BusinessOfferContentBody = Omit<Schemas["BusinessOfferInput"], "intent">;

/** PUT semantics: every field is sent; employee terms only while the switch is on. */
export function businessOfferBody(values: BusinessOfferValues): BusinessOfferContentBody {
  const selected = values.audienceType === "selected_businesses";
  return {
    category_id: values.categoryId,
    title: values.title,
    headline: values.headline,
    benefit: benefitValueBody(values.benefit),
    description: values.description,
    terms: values.terms,
    valid_from: fromDateTimeLocal(values.validFrom) ?? "",
    valid_until: fromDateTimeLocal(values.validUntil),
    audience_type: values.audienceType,
    audience_business_ids: selected ? values.audienceOrganizations.map((o) => o.id) : [],
    enquiry_instructions: values.enquiryInstructions,
    show_to_employees: values.showToEmployees,
    employee_terms: values.showToEmployees ? employeeTermsBody(values) : null,
    reason: values.reason,
  };
}

/** The terms an edit starts from: the working version, else the live one. */
export function businessOfferValues(offer: Offer): BusinessOfferValues {
  const version = editableVersion(offer);
  const business = version?.business_policy;
  if (!version || !business) return EMPTY_BUSINESS_OFFER;
  const employees = version.marketplace_policy;
  return {
    categoryId: business.category.id,
    title: version.title,
    headline: version.headline,
    benefit: benefitValueValues(version.benefit),
    description: version.description,
    terms: version.terms ?? "",
    validFrom: toDateTimeLocal(version.valid_from),
    validUntil: toDateTimeLocal(version.valid_until),
    audienceType: business.audience_type,
    audienceOrganizations: business.audience_businesses.map(({ id, name }) => ({ id, name })),
    enquiryInstructions: business.enquiry_instructions,
    showToEmployees: business.show_to_employees,
    ...(employees ? employeeTermsValues(employees) : EMPTY_EMPLOYEE_TERMS),
    reason: "",
  };
}

// --- Enquiries -------------------------------------------------------------------------

export const enquirySchema = z.object({
  message: requiredText(2000, "Tell the provider what your business needs"),
  contactName: requiredText(150, "Enter who they should contact"),
  contactEmail: z.string().trim().max(254).pipe(z.email("Enter a valid email")),
  contactPhone: optionalText(16).refine(
    (value) => value === "" || /^\+\d{6,15}$/.test(value),
    "Use international format, e.g. +9779801234567",
  ),
});
export type EnquiryValues = z.infer<typeof enquirySchema>;

export const ENQUIRY_FIELDS = {
  message: "message",
  contact_name: "contactName",
  contact_email: "contactEmail",
  contact_phone: "contactPhone",
} as const;

export function enquiryBody(values: EnquiryValues, versionId: string): Schemas["EnquiryInput"] {
  return {
    message: values.message,
    contact_name: values.contactName,
    contact_email: values.contactEmail,
    contact_phone: values.contactPhone,
    version_id: versionId,
  };
}

export const closeEnquirySchema = z.object({
  closingNote: optionalText(500),
});
export type CloseEnquiryValues = z.infer<typeof closeEnquirySchema>;
