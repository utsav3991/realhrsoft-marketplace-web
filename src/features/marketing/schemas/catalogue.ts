import { z } from "zod";

import type { Schemas } from "@/shared/api";
import { fromDateTimeLocal } from "@/shared/lib/format";

import type {
  AdvertisingGrant,
  GrantBasis,
  PlacementSlot,
  PlacementSurface,
  PortalAdvertisingGrant,
} from "../api/queries";

// Mirrors marketing/services/slots.py and grants.py; the server re-validates.

export const SURFACES: readonly { value: PlacementSurface; label: string }[] = [
  { value: "app_home", label: "Every portal's home page" },
  { value: "marketplace_home", label: "Benefits & Marketplace home" },
  { value: "marketplace_category", label: "Category page" },
  { value: "marketplace_offer_list", label: "Offer list" },
];

export const SURFACE_LABEL = Object.fromEntries(
  SURFACES.map(({ value, label }) => [value, label]),
) as Record<PlacementSurface, string>;

const SLOT_KEY = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const pixels = z
  .string()
  .trim()
  .refine((v) => /^\d{1,4}$/.test(v) && Number(v) >= 1 && Number(v) <= 4096, "Use 1-4096 px");

export const slotSchema = z.object({
  key: z
    .string()
    .trim()
    .max(100, "At most 100 characters")
    .regex(SLOT_KEY, "Use dotted lowercase words, e.g. marketplace.home.top"),
  name: z.string().trim().min(1, "Enter a name").max(100, "At most 100 characters"),
  surface: z.enum([
    "app_home",
    "marketplace_home",
    "marketplace_category",
    "marketplace_offer_list",
  ]),
  description: z.string().trim().max(500, "At most 500 characters"),
  allowedCreativeTypes: z
    .array(z.enum(["image_banner", "text_card"]))
    .min(1, "Accept at least one creative type"),
  width: pixels,
  height: pixels,
  maxAds: z
    .string()
    .trim()
    .refine((v) => /^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 20, "Use 1-20"),
  reason: z.string().trim().max(500, "Keep the note under 500 characters"),
});

export type SlotValues = z.infer<typeof slotSchema>;

export const EMPTY_SLOT: SlotValues = {
  key: "",
  name: "",
  surface: "marketplace_home",
  description: "",
  allowedCreativeTypes: ["image_banner"],
  width: "",
  height: "",
  maxAds: "1",
  reason: "",
};

export const SLOT_FIELDS = {
  key: "key",
  name: "name",
  surface: "surface",
  description: "description",
  allowed_creative_types: "allowedCreativeTypes",
  width: "width",
  height: "height",
  max_ads: "maxAds",
  reason: "reason",
} as const;

export function slotBody(values: SlotValues): Schemas["SlotInput"] {
  return {
    key: values.key,
    name: values.name,
    surface: values.surface,
    description: values.description,
    allowed_creative_types: values.allowedCreativeTypes,
    width: Number(values.width),
    height: Number(values.height),
    max_ads: Number(values.maxAds),
    // Random rotation is the only strategy so far.
    rotation: "random",
    reason: values.reason,
  };
}

export function slotValues(slot: PlacementSlot): SlotValues {
  return {
    key: slot.key,
    name: slot.name,
    surface: slot.surface,
    description: slot.description,
    allowedCreativeTypes: slot.allowed_creative_types.filter(
      (type): type is "image_banner" | "text_card" =>
        type === "image_banner" || type === "text_card",
    ),
    width: String(slot.width),
    height: String(slot.height),
    maxAds: String(slot.max_ads),
    reason: "",
  };
}

// --- Advertising grants ----------------------------------------------------------------

export const GRANT_BASES: readonly { value: GrantBasis; label: string }[] = [
  { value: "paid", label: "Paid" },
  { value: "complimentary", label: "Complimentary" },
  { value: "waived", label: "Waived" },
];

export const BASIS_LABEL = Object.fromEntries(
  GRANT_BASES.map(({ value, label }) => [value, label]),
) as Record<GrantBasis, string>;

export const grantSchema = z
  .object({
    organization: z.object({ id: z.string(), name: z.string() }).nullable(),
    basis: z.enum(["paid", "complimentary", "waived"]),
    reference: z.string().trim().max(200, "At most 200 characters"),
    validFrom: z.string().min(1, "Choose when advertising may start"),
    validUntil: z.string(),
    reason: z.string().trim().max(500, "Keep the note under 500 characters"),
  })
  .superRefine((values, ctx) => {
    if (!values.organization)
      ctx.addIssue({ code: "custom", path: ["organization"], message: "Choose an organization" });
    if (values.validUntil && values.validUntil <= values.validFrom)
      ctx.addIssue({ code: "custom", path: ["validUntil"], message: "End after the start" });
  });

export type GrantValues = z.infer<typeof grantSchema>;

export const GRANT_FIELDS = {
  organization_id: "organization",
  basis: "basis",
  reference: "reference",
  valid_from: "validFrom",
  valid_until: "validUntil",
  reason: "reason",
} as const;

export function grantBody(values: GrantValues): Schemas["GrantInput"] {
  return {
    organization_id: values.organization?.id ?? "",
    basis: values.basis,
    reference: values.reference,
    valid_from: fromDateTimeLocal(values.validFrom) ?? "",
    valid_until: fromDateTimeLocal(values.validUntil),
    reason: values.reason,
  };
}

export type GrantState = "active" | "scheduled" | "expired" | "revoked";

/** The grant's badge: revoked first, then its window against `now`. */
export function grantState(
  grant: Pick<AdvertisingGrant | PortalAdvertisingGrant, "revoked_at" | "valid_from" | "valid_until" | "active">,
  now = new Date(),
): GrantState {
  if (grant.revoked_at) return "revoked";
  if (grant.active) return "active";
  if (new Date(grant.valid_from) > now) return "scheduled";
  return "expired";
}
