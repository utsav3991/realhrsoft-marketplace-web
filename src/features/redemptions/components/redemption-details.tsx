"use client";

import { Ban, CircleAlert, ShieldAlert, TimerOff } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { presentationLabel } from "@/features/offers/schemas/offer";
import { benefitSummary, type BenefitValue } from "@/features/offers/schemas/benefit-value";
import { ApiError, errorMessage, type Schemas } from "@/shared/api";
import { Detail } from "@/shared/components/details";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDateTime } from "@/shared/lib/format";

import type { PartnerReceipt, RedemptionSource, VoucherStatus } from "../api/queries";

export const VOUCHER_STATUSES: readonly { value: VoucherStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "not_yet_valid", label: "Not yet valid" },
  { value: "used", label: "Used" },
  { value: "expired", label: "Expired" },
  { value: "revoked", label: "Revoked" },
  { value: "reversed", label: "Reversed" },
];

export function voucherStatusFrom(value: string | null): VoucherStatus | null {
  return VOUCHER_STATUSES.find((s) => s.value === value)?.value ?? null;
}

export const SOURCE_LABEL: Record<RedemptionSource, string> = {
  partner_scan: "QR scan",
  partner_manual: "Typed reference",
  admin_assisted: "Aayulogic on behalf",
};
export const SOURCES = Object.keys(SOURCE_LABEL) as RedemptionSource[];

export function sourceFrom(value: string | null): RedemptionSource | null {
  return SOURCES.find((s) => s === value) ?? null;
}

const BENEFIT_TYPES = new Set(["percentage", "fixed_amount", "free_item", "descriptive"]);

/**
 * The benefit envelope frozen on a voucher. The API documents it as free JSON, so it is checked
 * before use; an unknown shape renders nothing rather than a wrong discount.
 */
export function voucherBenefit(value: unknown): BenefitValue | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Partial<BenefitValue>;
  return typeof candidate.type === "string" &&
    BENEFIT_TYPES.has(candidate.type) &&
    typeof candidate.description === "string"
    ? (candidate as BenefitValue)
    : null;
}

/** The discount to apply, e.g. "20% off (up to NPR 500)", with its description. */
export function BenefitText({ benefit }: { benefit: unknown }): ReactNode {
  const value = voucherBenefit(benefit);
  if (!value) return <span className="text-muted-foreground">See the offer&apos;s terms</span>;
  return (
    <>
      <span className="font-semibold">{benefitSummary(value)}</span>
      {value.type !== "descriptive" && value.description ? (
        <span className="text-muted-foreground block text-xs">{value.description}</span>
      ) : null}
    </>
  );
}

/** How the partner applies the benefit, frozen at acceptance. */
export function PresentationFacts({
  presentation,
}: {
  presentation: Schemas["Presentation"];
}): ReactNode {
  return (
    <>
      <Detail label="Applied by">
        {presentationLabel(presentation.method, presentation.custom_method_name)}
      </Detail>
      {presentation.method === "promo_code" && presentation.promo_code ? (
        <Detail label="Promo code">
          <span className="font-mono">{presentation.promo_code}</span>
        </Detail>
      ) : null}
    </>
  );
}

export function ReceiptStatusBadge({ receipt }: { receipt: Pick<PartnerReceipt, "reversed_at"> }) {
  return (
    <StatusBadge domain="redemption" status={receipt.reversed_at ? "reversed" : "confirmed"} />
  );
}

/** What every audience may see of a receipt. */
export function ReceiptFacts({ receipt }: { receipt: PartnerReceipt }): ReactNode {
  return (
    <>
      <Detail label="Status">
        <ReceiptStatusBadge receipt={receipt} />
      </Detail>
      <Detail label="Confirmed">{formatDateTime(receipt.confirmed_at)}</Detail>
      <Detail label="Confirmed by">{SOURCE_LABEL[receipt.source]}</Detail>
      <Detail label="Bill reference">
        {receipt.sale_reference || <span className="text-muted-foreground">—</span>}
      </Detail>
      {receipt.reversed_at ? (
        <Detail label="Reversed">{formatDateTime(receipt.reversed_at)}</Detail>
      ) : null}
      {receipt.reversal_reason ? (
        <Detail label="Why it was reversed" className="sm:col-span-2 lg:col-span-3">
          <span className="whitespace-pre-line">{receipt.reversal_reason}</span>
        </Detail>
      ) : null}
    </>
  );
}

/** Voucher refusals shown as a verdict, so the cashier knows whether to apply the benefit. */
const VOUCHER_REFUSALS: Record<string, { title: string; icon: typeof Ban }> = {
  VOUCHER_ALREADY_USED: { title: "Already used: do not apply the benefit", icon: Ban },
  VOUCHER_REVOKED: { title: "Withdrawn: do not apply the benefit", icon: Ban },
  VOUCHER_EXPIRED: { title: "Expired", icon: TimerOff },
  VOUCHER_NOT_YET_VALID: { title: "Not valid yet", icon: TimerOff },
  REDEMPTION_BLOCKED: { title: "Temporarily blocked by Aayulogic", icon: ShieldAlert },
  CREDENTIAL_INVALID: { title: "QR code not valid here", icon: CircleAlert },
  SCAN_INVALID: { title: "Scan not valid", icon: CircleAlert },
  SCAN_EXPIRED: { title: "Scan expired", icon: TimerOff },
  SCAN_LIMIT_REACHED: { title: "Too many open scans", icon: CircleAlert },
  PARTNER_NOT_VERIFIED: { title: "Your registration is not verified", icon: ShieldAlert },
  RATE_LIMITED: { title: "Too many attempts", icon: CircleAlert },
};

/** A failed voucher command: a named verdict for known refusals, the API's detail otherwise. */
export function VoucherErrorAlert({ error }: { error: unknown }) {
  const refusal = error instanceof ApiError ? VOUCHER_REFUSALS[error.code] : undefined;
  const Icon = refusal?.icon ?? CircleAlert;
  return (
    <Alert variant="destructive" role="alert">
      <Icon aria-hidden />
      <AlertTitle>{refusal?.title ?? "That did not work"}</AlertTitle>
      <AlertDescription>{errorMessage(error)}</AlertDescription>
    </Alert>
  );
}
