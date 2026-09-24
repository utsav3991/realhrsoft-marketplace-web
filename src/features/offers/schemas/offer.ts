import { z } from "zod";

import type { Schemas } from "@/shared/api";
import { fromDateTimeLocal, toDateTimeLocal } from "@/shared/lib/format";

// Mirrors the backend bounds; the server re-validates. Only "all eligible users" targeting is
// available (open question #4); a Partner can never target "own employees".
export const offerSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a title").max(150),
    description: z.string().trim().min(1, "Describe the offer").max(4000),
    category: z.string().trim().min(1, "Enter a category").max(64),
    redemptionInstructions: z.string().trim().min(1, "Explain how to redeem the offer").max(2000),
    terms: z.string().trim().max(4000),
    validFrom: z.string(),
    validUntil: z.string(),
  })
  .refine(
    (values) =>
      !values.validFrom ||
      !values.validUntil ||
      new Date(values.validUntil) > new Date(values.validFrom),
    { path: ["validUntil"], message: "The end must be after the start" },
  );
export type OfferValues = z.infer<typeof offerSchema>;

export const EMPTY_OFFER: OfferValues = {
  title: "",
  description: "",
  category: "",
  redemptionInstructions: "",
  terms: "",
  validFrom: "",
  validUntil: "",
};

export function offerBody(values: OfferValues): Schemas["OfferBody"] {
  return {
    title: values.title,
    description: values.description,
    category: values.category,
    redemption_instructions: values.redemptionInstructions,
    terms: values.terms || null,
    audience: "all_eligible_users",
    valid_from: fromDateTimeLocal(values.validFrom),
    valid_until: fromDateTimeLocal(values.validUntil),
  };
}

export function offerValues(offer: Schemas["OfferResponse"]): OfferValues {
  return {
    title: offer.title,
    description: offer.description,
    category: offer.category,
    redemptionInstructions: offer.redemption_instructions,
    terms: offer.terms ?? "",
    validFrom: toDateTimeLocal(offer.valid_from),
    validUntil: toDateTimeLocal(offer.valid_until),
  };
}

export const OFFER_FIELDS = {
  title: "title",
  description: "description",
  category: "category",
  redemption_instructions: "redemptionInstructions",
  terms: "terms",
  valid_from: "validFrom",
  valid_until: "validUntil",
} as const;
