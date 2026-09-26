import { z } from "zod";

import type { Schemas } from "@/shared/api";

// The benefit envelope shared by marketplace offers and company benefits. Mirrors
// offers/terms.py clean_benefit; the server re-validates. Money stays a decimal string.
export type BenefitValue = Schemas["BenefitValue"];
export type BenefitType = Schemas["TypeEnum"];

export const BENEFIT_TYPES: readonly { value: BenefitType; label: string }[] = [
  { value: "percentage", label: "Percentage off" },
  { value: "fixed_amount", label: "Fixed amount off" },
  { value: "free_item", label: "Free item" },
  { value: "descriptive", label: "Described in words" },
];

const DECIMAL = /^\d{1,9}(\.\d{1,2})?$/;
const CURRENCY = /^[A-Za-z]{3}$/;
export const DEFAULT_CURRENCY = "NPR";

export const benefitValueSchema = z
  .object({
    type: z.enum(["descriptive", "percentage", "fixed_amount", "free_item"]),
    description: z.string().trim().max(500, "At most 500 characters"),
    percent: z.string().trim(),
    maxDiscountAmount: z.string().trim(),
    amount: z.string().trim(),
    currency: z.string().trim(),
    item: z.string().trim().max(150, "At most 150 characters"),
  })
  .superRefine((values, ctx) => {
    const issue = (path: keyof typeof values, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    const money = (path: "amount" | "maxDiscountAmount", message: string) => {
      const value = values[path];
      if (!DECIMAL.test(value) || Number(value) <= 0 || Number(value) > 100_000_000)
        issue(path, message);
    };
    const needsCurrency =
      values.type === "fixed_amount" || (values.type === "percentage" && values.maxDiscountAmount);
    switch (values.type) {
      case "descriptive":
        if (!values.description) issue("description", "Describe the benefit");
        break;
      case "percentage":
        if (!DECIMAL.test(values.percent) || Number(values.percent) <= 0 || Number(values.percent) > 100)
          issue("percent", "Use a number above 0 and at most 100, with up to 2 decimals");
        if (values.maxDiscountAmount) money("maxDiscountAmount", "Use a positive amount");
        break;
      case "fixed_amount":
        money("amount", "Use a positive amount, with up to 2 decimals");
        break;
      case "free_item":
        if (!values.item) issue("item", "Name the free item");
        break;
    }
    if (needsCurrency && !CURRENCY.test(values.currency))
      issue("currency", "Use a 3-letter currency code, e.g. NPR");
  });
export type BenefitValueValues = z.infer<typeof benefitValueSchema>;

export const EMPTY_BENEFIT_VALUE: BenefitValueValues = {
  type: "percentage",
  description: "",
  percent: "",
  maxDiscountAmount: "",
  amount: "",
  currency: DEFAULT_CURRENCY,
  item: "",
};

/** Request field → form field, for placing 422 errors on the nested inputs. */
export const BENEFIT_VALUE_FIELDS = {
  "benefit.type": "benefit.type",
  "benefit.description": "benefit.description",
  "benefit.percent": "benefit.percent",
  "benefit.max_discount_amount": "benefit.maxDiscountAmount",
  "benefit.amount": "benefit.amount",
  "benefit.currency": "benefit.currency",
  "benefit.item": "benefit.item",
  benefit: "benefit.type",
} as const;

/** Only the chosen type's fields carry values; the API ignores the others when empty. */
export function benefitValueBody(values: BenefitValueValues): Schemas["BenefitValueInput"] {
  const body: Schemas["BenefitValueInput"] = {
    type: values.type,
    description: values.description,
    currency: "",
    item: "",
  };
  switch (values.type) {
    case "percentage":
      body.percent = values.percent;
      if (values.maxDiscountAmount) {
        body.max_discount_amount = values.maxDiscountAmount;
        body.currency = values.currency.toUpperCase();
      }
      break;
    case "fixed_amount":
      body.amount = values.amount;
      body.currency = values.currency.toUpperCase();
      break;
    case "free_item":
      body.item = values.item;
      break;
    case "descriptive":
      break;
  }
  return body;
}

export function benefitValueValues(benefit: BenefitValue): BenefitValueValues {
  return {
    type: benefit.type,
    description: benefit.description,
    percent: benefit.percent ?? "",
    maxDiscountAmount: benefit.max_discount_amount ?? "",
    amount: benefit.amount ?? "",
    currency: benefit.currency || DEFAULT_CURRENCY,
    item: benefit.item ?? "",
  };
}

/** "12.50" → "12.5", "20.00" → "20": decimal strings shown without trailing zeros. */
function trimDecimal(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

/**
 * A short statement of the value: "20% off (up to NPR 500)", "NPR 200 off", "Free: Coffee".
 * The description, when present, is the partner's own wording and is shown separately.
 */
export function benefitSummary(benefit: BenefitValue): string {
  switch (benefit.type) {
    case "percentage": {
      const cap = benefit.max_discount_amount
        ? ` (up to ${benefit.currency ?? ""} ${trimDecimal(benefit.max_discount_amount)})`
        : "";
      return `${trimDecimal(benefit.percent ?? "")}% off${cap}`;
    }
    case "fixed_amount":
      return `${benefit.currency ?? ""} ${trimDecimal(benefit.amount ?? "")} off`;
    case "free_item":
      return `Free: ${benefit.item ?? ""}`;
    case "descriptive":
      return benefit.description;
  }
}
