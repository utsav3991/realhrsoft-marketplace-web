import { z } from "zod";

import type { Schemas } from "@/shared/api";

// Mirror the Partner domain's bounds and formats; the server re-validates everything.
const optionalText = (max: number) => z.string().trim().max(max, `At most ${max} characters`);
const IDENTIFIER = /^[A-Za-z0-9](?:[A-Za-z0-9 ./-]{0,62}[A-Za-z0-9])?$/;
const identifier = (label: string) =>
  optionalText(64).refine(
    (value) => value === "" || IDENTIFIER.test(value),
    `${label}: letters, digits, spaces, '.', '/' or '-'`,
  );

export const profileSchema = z.object({
  legalName: z.string().trim().min(1, "Enter the legal business name").max(200),
  displayName: z.string().trim().min(1, "Enter a display name").max(150),
  registrationNumber: identifier("Registration number"),
  taxIdentifier: identifier("Tax identifier"),
  website: optionalText(300).refine(
    (value) => value === "" || /^https?:\/\//.test(value),
    "Start the website with https://",
  ),
  description: optionalText(2000),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const EMPTY_PROFILE: ProfileValues = {
  legalName: "",
  displayName: "",
  registrationNumber: "",
  taxIdentifier: "",
  website: "",
  description: "",
};

/** Request body field → form field, for placing 422 errors. */
export const PROFILE_FIELDS = {
  legal_name: "legalName",
  display_name: "displayName",
  registration_number: "registrationNumber",
  tax_identifier: "taxIdentifier",
  website: "website",
  description: "description",
} as const;

export function profileBody(values: ProfileValues): Schemas["BusinessProfileBody"] {
  return {
    legal_name: values.legalName,
    display_name: values.displayName,
    registration_number: values.registrationNumber || null,
    tax_identifier: values.taxIdentifier || null,
    website: values.website || null,
    description: values.description || null,
  };
}

export function profileValues(profile: Schemas["PartnerProfileView"]): ProfileValues {
  return {
    legalName: profile.legal_business_name,
    displayName: profile.display_name,
    registrationNumber: profile.registration_number ?? "",
    taxIdentifier: profile.tax_identifier ?? "",
    website: profile.website ?? "",
    description: profile.description ?? "",
  };
}

const PHONE = /^\+?[0-9 ()-]{5,30}$/;

export const contactSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name").max(150),
    title: optionalText(100),
    email: optionalText(320).refine(
      (value) => value === "" || z.email().safeParse(value).success,
      "Enter a valid email",
    ),
    phone: optionalText(40).refine(
      (value) => value === "" || PHONE.test(value),
      "Enter a valid phone number",
    ),
    primary: z.boolean(),
  })
  .refine((value) => value.email !== "" || value.phone !== "", {
    message: "Enter an email or a phone number",
    path: ["email"],
  });
export type ContactValues = z.infer<typeof contactSchema>;

export const CONTACT_FIELDS = {
  name: "name",
  title: "title",
  email: "email",
  phone: "phone",
} as const;

export function contactBody(values: ContactValues) {
  return {
    name: values.name,
    title: values.title || null,
    email: values.email || null,
    phone: values.phone || null,
  };
}

export const locationSchema = z.object({
  label: z.string().trim().min(1, "Enter a label, such as Head office").max(100),
  line1: z.string().trim().min(1, "Enter the address").max(200),
  line2: optionalText(200),
  city: z.string().trim().min(1, "Enter the city").max(100),
  region: optionalText(100),
  postalCode: optionalText(20),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Enter a two-letter country code, such as NP"),
});
export type LocationValues = z.infer<typeof locationSchema>;

export const LOCATION_FIELDS = {
  label: "label",
  line1: "line1",
  line2: "line2",
  city: "city",
  region: "region",
  postal_code: "postalCode",
  country_code: "countryCode",
} as const;

export function locationBody(values: LocationValues, version: number): Schemas["LocationBody"] {
  return {
    label: values.label,
    line1: values.line1,
    line2: values.line2 || null,
    city: values.city,
    region: values.region || null,
    postal_code: values.postalCode || null,
    country_code: values.countryCode.toUpperCase(),
    version,
  };
}
