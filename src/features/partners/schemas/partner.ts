import { z } from "zod";

import type { Schemas } from "@/shared/api";
import { reasonSchema } from "@/shared/forms/reason";

// Mirrors the Django partner serializers' bounds and formats; the server re-validates.
const optionalText = (max: number) => z.string().trim().max(max, `At most ${max} characters`);
const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, `At most ${max} characters`);

export const profileSchema = z.object({
  businessName: requiredText(255, "Enter the business name"),
  category: optionalText(100),
  description: optionalText(2000),
  contactName: requiredText(150, "Enter the contact person's name"),
  contactEmail: z.string().trim().max(254).pipe(z.email("Enter a valid email")),
  contactPhone: optionalText(16).refine(
    (value) => value === "" || /^\+\d{6,15}$/.test(value),
    "Use international format, e.g. +9779801234567",
  ),
  website: optionalText(500).refine(
    (value) => value === "" || /^https?:\/\/\S+$/.test(value),
    "Start the website with https://",
  ),
  // Required for Aayulogic's assisted edits, optional for self-service (see ProfileForm).
  reason: z.string().trim().max(500, "Keep the reason under 500 characters"),
});
export type ProfileValues = z.infer<typeof profileSchema>;

/** Assisted intake and edits always carry an audited reason. */
export const assistedProfileSchema = profileSchema.extend({ reason: reasonSchema });

export const EMPTY_PROFILE: ProfileValues = {
  businessName: "",
  category: "",
  description: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
  reason: "",
};

/** Request body field → form field, for placing 422 errors. */
export const PROFILE_FIELDS = {
  business_name: "businessName",
  category: "category",
  description: "description",
  contact_name: "contactName",
  contact_email: "contactEmail",
  contact_phone: "contactPhone",
  website: "website",
  reason: "reason",
} as const;

/** PUT semantics: every field is sent, and an empty optional field clears it. */
export function profileBody(values: ProfileValues): Schemas["PartnerProfileInput"] {
  return {
    business_name: values.businessName,
    category: values.category,
    description: values.description,
    contact_name: values.contactName,
    contact_email: values.contactEmail,
    contact_phone: values.contactPhone,
    website: values.website,
    reason: values.reason,
  };
}

export function profileValues(partner: Schemas["Partner"]): ProfileValues {
  return {
    businessName: partner.business_name,
    category: partner.category ?? "",
    description: partner.description ?? "",
    contactName: partner.contact_name,
    contactEmail: partner.contact_email,
    contactPhone: partner.contact_phone ?? "",
    website: partner.website ?? "",
    reason: "",
  };
}
