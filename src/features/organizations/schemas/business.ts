import { z } from "zod";

import { isUuid } from "@/shared/api";
import { reasonSchema } from "@/shared/forms/reason";

// Mirrors the backend bounds (organizations BusinessDetails); the server re-validates.
const optionalText = (max: number) => z.string().trim().max(max, `At most ${max} characters`);

export const contactSchema = z.object({
  displayName: z.string().trim().min(1, "Enter a display name").max(150),
  contactEmail: z.string().trim().email("Enter a valid email").max(320),
  contactPhone: optionalText(40),
  website: optionalText(300).refine(
    (value) => value === "" || /^https?:\/\//.test(value),
    "Start the website with https://",
  ),
  description: optionalText(2000),
});
export type ContactValues = z.infer<typeof contactSchema>;

export const businessSchema = contactSchema.extend({
  legalName: z.string().trim().min(1, "Enter the legal name").max(200),
});
export type BusinessValues = z.infer<typeof businessSchema>;

export const assistedApplicationSchema = businessSchema.extend({
  applicantUserId: z.string().trim().refine(isUuid, "Enter the applicant's user ID"),
  reason: reasonSchema,
});
export type AssistedApplicationValues = z.infer<typeof assistedApplicationSchema>;

export const EMPTY_BUSINESS: BusinessValues = {
  legalName: "",
  displayName: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
  description: "",
};

/** Form values → request body (empty optional fields become null). */
export function contactBody(values: ContactValues) {
  return {
    display_name: values.displayName,
    contact_email: values.contactEmail,
    contact_phone: values.contactPhone || null,
    website: values.website || null,
    description: values.description || null,
  };
}

export function businessBody(values: BusinessValues) {
  return { legal_name: values.legalName, ...contactBody(values) };
}

/** Request body field → form field, for placing 422 errors. */
export const CONTACT_FIELDS = {
  display_name: "displayName",
  contact_email: "contactEmail",
  contact_phone: "contactPhone",
  website: "website",
  description: "description",
} as const;

export const BUSINESS_FIELDS = { legal_name: "legalName", ...CONTACT_FIELDS } as const;

interface BusinessDetailsResponse {
  legal_name: string;
  display_name: string;
  contact_email: string;
  contact_phone: string | null;
  website: string | null;
  description: string | null;
}

export function businessValues(details: BusinessDetailsResponse): BusinessValues {
  return {
    legalName: details.legal_name,
    displayName: details.display_name,
    contactEmail: details.contact_email,
    contactPhone: details.contact_phone ?? "",
    website: details.website ?? "",
    description: details.description ?? "",
  };
}
