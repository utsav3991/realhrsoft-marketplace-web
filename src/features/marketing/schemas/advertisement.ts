import { z } from "zod";

import type { Schemas } from "@/shared/api";

import type {
  AdRevision,
  Advertisement,
  CreativeAsset,
  CreativeType,
  DestinationType,
  PlacementSlot,
} from "../api/queries";

// Mirrors marketing/creatives.py and marketing/destinations.py; the server re-validates and
// answers 422 with a message for anything these checks miss.
export const MAX_SLOTS = 10;
/** How far an image's aspect ratio may differ from its slot's. */
export const ASPECT_TOLERANCE = 0.02;
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const CREATIVE_TYPES: readonly { value: CreativeType; label: string; hint: string }[] = [
  {
    value: "image_banner",
    label: "Image banner",
    hint: "An uploaded image with alt text and an optional headline and button label.",
  },
  {
    value: "text_card",
    label: "Text card",
    hint: "A headline with optional supporting text and button label; no image.",
  },
];

export const CREATIVE_LABEL = Object.fromEntries(
  CREATIVE_TYPES.map(({ value, label }) => [value, label]),
) as Record<CreativeType, string>;

export const DESTINATION_LABEL: Record<DestinationType, string> = {
  external_url: "External link",
  offer: "One of your offers",
  ad_page: "Advertisement page",
};

/** Where an advertisement page's button leads, if it has one. */
export type PageAction = "none" | "offer" | "external_url";

export const PAGE_ACTION_LABEL: Record<PageAction, string> = {
  none: "No button",
  offer: "One of your offers",
  external_url: "External link",
};

/** The button text an employee sees when the owner left the label empty. */
export const DEFAULT_ACTION_LABEL: Record<Exclude<PageAction, "none">, string> = {
  offer: "View offer",
  external_url: "Visit website",
};

export const PAGE_TITLE_MAX = 120;
export const PAGE_BODY_MAX = 5000;

const HTTPS_URL = /^https:\/\/[^\s/$.?#][^\s]*$/;
const text = (max: number) => z.string().trim().max(max, `At most ${max} characters`);

export const adSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name").max(150, "At most 150 characters"),
    creativeType: z.enum(["image_banner", "text_card"]),
    assetId: z.string(),
    altText: text(150),
    headline: text(80),
    body: text(200),
    ctaLabel: text(30),
    destinationType: z.enum(["external_url", "offer", "ad_page"]),
    url: text(2000),
    offerId: z.string(),
    pageTitle: text(PAGE_TITLE_MAX),
    pageBody: text(PAGE_BODY_MAX),
    pageAction: z.enum(["none", "offer", "external_url"]),
    actionLabel: text(30),
    slotKeys: z
      .array(z.string())
      .min(1, "Choose at least one placement")
      .max(MAX_SLOTS, `Choose at most ${MAX_SLOTS} placements`),
    reason: z.string().trim().max(500, "Keep the note under 500 characters"),
  })
  .superRefine((values, ctx) => {
    const issue = (path: keyof typeof values, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (values.creativeType === "image_banner") {
      if (!values.assetId) issue("assetId", "Upload or choose an image");
      if (!values.altText) issue("altText", "Describe the image for screen readers");
    } else if (!values.headline) {
      issue("headline", "Enter a headline");
    }
    if (values.destinationType === "ad_page") {
      if (!values.pageTitle) issue("pageTitle", "Enter a page title");
      if (!values.pageBody) issue("pageBody", "Enter the page text");
    }
    const target = linkTarget(values);
    if (target === "external_url") {
      if (!HTTPS_URL.test(values.url)) issue("url", "Enter a link starting with https://");
      else if (/^https:\/\/[^/]*@/.test(values.url))
        issue("url", "Remove the user name or password");
    } else if (target === "offer" && !values.offerId) {
      issue("offerId", "Choose an offer");
    }
  });

/** Which link the form asks for: the destination's own, or an advertisement page's button. */
export function linkTarget(
  values: Pick<AdValues, "destinationType" | "pageAction">,
): Exclude<PageAction, "none"> | null {
  if (values.destinationType !== "ad_page") return values.destinationType;
  return values.pageAction === "none" ? null : values.pageAction;
}

export type AdValues = z.infer<typeof adSchema>;

export const EMPTY_AD: AdValues = {
  name: "",
  creativeType: "image_banner",
  assetId: "",
  altText: "",
  headline: "",
  body: "",
  ctaLabel: "",
  destinationType: "external_url",
  url: "",
  offerId: "",
  pageTitle: "",
  pageBody: "",
  pageAction: "none",
  actionLabel: "",
  slotKeys: [],
  reason: "",
};

/** Request body field → form field, for placing 422 errors. */
export const AD_FIELDS = {
  name: "name",
  creative_type: "creativeType",
  destination_type: "destinationType",
  slot_keys: "slotKeys",
  reason: "reason",
} as const;

export type AdContentBody = Omit<Schemas["AdUpdate"], "expected_version" | "intent">;

/** PUT semantics: the whole content; each type sends only its own fields. */
export function adBody(values: AdValues): AdContentBody {
  const creative =
    values.creativeType === "image_banner"
      ? {
          asset_id: values.assetId,
          alt_text: values.altText,
          headline: values.headline,
          cta_label: values.ctaLabel,
        }
      : { headline: values.headline, body: values.body, cta_label: values.ctaLabel };
  return {
    name: values.name,
    creative_type: values.creativeType,
    creative,
    destination_type: values.destinationType,
    destination: destinationBody(values),
    slot_keys: values.slotKeys,
    reason: values.reason,
  };
}

function destinationBody(values: AdValues): Record<string, string> {
  const target = linkTarget(values);
  const link: Record<string, string> =
    target === "external_url"
      ? { url: values.url }
      : target === "offer"
        ? { offer_id: values.offerId }
        : {};
  if (values.destinationType !== "ad_page") return link;
  return {
    title: values.pageTitle,
    body: values.pageBody,
    ...link,
    ...(target && values.actionLabel ? { action_label: values.actionLabel } : {}),
  };
}

// --- Reading stored envelopes ------------------------------------------------------------

const field = (payload: Record<string, unknown>, name: string) => {
  const value = payload[name];
  return typeof value === "string" ? value : "";
};

/** A revision's creative, read defensively: the envelope is typed only as an object. */
export interface CreativeView {
  type: CreativeType;
  assetId: string | null;
  altText: string;
  headline: string;
  body: string;
  ctaLabel: string;
}

export function creativeView(revision: AdRevision): CreativeView {
  const payload = revision.creative;
  return {
    type: revision.creative_type === "text_card" ? "text_card" : "image_banner",
    assetId: field(payload, "asset_id") || null,
    altText: field(payload, "alt_text"),
    headline: field(payload, "headline"),
    body: field(payload, "body"),
    ctaLabel: field(payload, "cta_label"),
  };
}

export type DestinationView =
  | { type: "external_url"; url: string }
  | { type: "offer"; offerId: string }
  | { type: "ad_page"; page: AdPageContent };

/** An advertisement page as stored: title, body and an optional button. */
export interface AdPageContent {
  title: string;
  body: string;
  action: PageAction;
  url: string;
  offerId: string;
  actionLabel: string;
}

export function destinationView(revision: AdRevision): DestinationView {
  const payload = revision.destination;
  if (revision.destination_type === "offer")
    return { type: "offer", offerId: field(payload, "offer_id") };
  if (revision.destination_type === "ad_page") {
    const url = field(payload, "url");
    const offerId = field(payload, "offer_id");
    return {
      type: "ad_page",
      page: {
        title: field(payload, "title"),
        body: field(payload, "body"),
        action: url ? "external_url" : offerId ? "offer" : "none",
        url,
        offerId,
        actionLabel: field(payload, "action_label"),
      },
    };
  }
  return { type: "external_url", url: field(payload, "url") };
}

/**
 * The content an edit starts from: the working revision (a draft, or a frozen one an edit
 * copies into a new draft), else the approved one.
 */
export function editableRevision(ad: Advertisement): AdRevision | null {
  return ad.working_revision ?? ad.current_revision;
}

export function adValues(ad: Advertisement): AdValues {
  const revision = editableRevision(ad);
  if (!revision) return { ...EMPTY_AD, name: ad.name };
  const creative = creativeView(revision);
  const destination = destinationView(revision);
  return {
    name: ad.name,
    creativeType: creative.type,
    assetId: creative.assetId ?? "",
    altText: creative.altText,
    headline: creative.headline,
    body: creative.body,
    ctaLabel: creative.ctaLabel,
    destinationType: destination.type,
    ...destinationValues(destination),
    // Inactive slots cannot be targeted again, so an edit starts without them.
    slotKeys: revision.slots.filter((slot) => slot.is_active).map((slot) => slot.key),
    reason: "",
  };
}

function destinationValues(
  destination: DestinationView,
): Pick<AdValues, "url" | "offerId" | "pageTitle" | "pageBody" | "pageAction" | "actionLabel"> {
  const empty = {
    url: "",
    offerId: "",
    pageTitle: "",
    pageBody: "",
    pageAction: "none",
    actionLabel: "",
  } as const;
  switch (destination.type) {
    case "external_url":
      return { ...empty, url: destination.url };
    case "offer":
      return { ...empty, offerId: destination.offerId };
    case "ad_page": {
      const { page } = destination;
      return {
        url: page.url,
        offerId: page.offerId,
        pageTitle: page.title,
        pageBody: page.body,
        pageAction: page.action,
        actionLabel: page.actionLabel,
      };
    }
  }
}

// --- Slot fit ----------------------------------------------------------------------------

/**
 * Why a creative cannot render in a slot, or null when it fits. Mirrors the server's check so
 * the form can say so before saving; the server has the last word.
 */
export function slotMisfit(
  slot: Pick<PlacementSlot, "allowed_creative_types" | "width" | "height">,
  creativeType: CreativeType,
  asset: Pick<CreativeAsset, "width" | "height"> | null,
): string | null {
  if (!slot.allowed_creative_types.includes(creativeType))
    return `Does not accept ${CREATIVE_LABEL[creativeType].toLowerCase()}s`;
  if (creativeType !== "image_banner" || !asset) return null;
  const wanted = slot.width / slot.height;
  if (Math.abs(asset.width / asset.height - wanted) > wanted * ASPECT_TOLERANCE)
    return `Needs a ${slot.width}×${slot.height} aspect ratio; the image is ${asset.width}×${asset.height}`;
  if (asset.width < slot.width || asset.height < slot.height)
    return `Needs at least ${slot.width}×${slot.height} px; the image is ${asset.width}×${asset.height}`;
  return null;
}

/** A client-side check before upload; the server detects the type from the content. */
export function imageFileProblem(file: File): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type))
    return "Choose a PNG, JPEG or WebP image";
  if (file.size > MAX_IMAGE_BYTES) return "Choose an image of at most 2 MB";
  return null;
}
