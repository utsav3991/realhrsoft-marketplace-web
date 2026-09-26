"use client";

import { CheckCircle2, Clock, Copy, ExternalLink, TimerOff, UserX } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { RichText } from "@/design-system/components/rich-text-editor";
import { EmptyState } from "@/design-system/components/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import { REDEMPTION_LABEL } from "@/features/offers/schemas/offer";
import { ApiError } from "@/shared/api";
import { Detail } from "@/shared/components/details";
import { QrCode } from "@/shared/components/qr-code";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";

import type { ClaimStatus, EmployeeClaim, PartnerClaim } from "../api/queries";

export const CLAIM_STATUSES: readonly { value: ClaimStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "used", label: "Used" },
  { value: "expired", label: "Expired" },
];

export function claimStatusFrom(value: string | null): ClaimStatus | null {
  return CLAIM_STATUSES.find((s) => s.value === value)?.value ?? null;
}

/** The redemption method's label; a custom method shows the partner's own name for it. */
export function methodLabel(claim: {
  redemption_method: EmployeeClaim["redemption_method"];
  custom_method_name?: string;
}): string {
  return claim.redemption_method === "custom" && claim.custom_method_name
    ? claim.custom_method_name
    : REDEMPTION_LABEL[claim.redemption_method];
}

function copy(value: string, what: string) {
  navigator.clipboard.writeText(value).then(
    () => toast.success(`${what} copied`),
    () => toast.error(`Could not copy the ${what.toLowerCase()}`),
  );
}

/** The 10-character reference the employee shows and the partner confirms with. */
export function ReferenceCode({ reference, copyable = false }: { reference: string; copyable?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-lg font-bold tracking-[0.2em]">{reference}</span>
      {copyable ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Copy reference"
          onClick={() => copy(reference, "Reference")}
        >
          <Copy aria-hidden />
        </Button>
      ) : null}
    </span>
  );
}

/**
 * The redemption details snapshotted when the claim was made. Later offer edits never change
 * them. Showing a code or opening a link does not mark the claim used; the partner confirms.
 */
export function RedemptionDetails({
  claim,
  copyable = false,
  scannable = false,
}: {
  claim: Pick<
    EmployeeClaim,
    | "redemption_method"
    | "redemption_code"
    | "redemption_url"
    | "redemption_instructions"
    | "custom_method_name"
  >;
  copyable?: boolean;
  /** Draw a QR-code claim as a scannable code, for the employee while it can be redeemed. */
  scannable?: boolean;
}) {
  const method = claim.redemption_method;
  return (
    <>
      <Detail label="Method">{methodLabel(claim)}</Detail>
      {method === "qr_code" && scannable && claim.redemption_code ? (
        <Detail label="QR code" className="sm:col-span-2 lg:col-span-3">
          <span className="block space-y-2">
            <QrCode value={claim.redemption_code} label="QR code to show the partner" />
            <span className="text-muted-foreground block text-sm">
              Show this code to the partner to scan.
            </span>
          </span>
        </Detail>
      ) : null}
      {(method === "promo_code" || method === "qr_code") && claim.redemption_code ? (
        <Detail label={method === "qr_code" ? "QR code value" : "Promo code"}>
          <span className="inline-flex items-center gap-2">
            <span className="font-mono text-base font-bold">{claim.redemption_code}</span>
            {copyable ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Copy code"
                onClick={() => copy(claim.redemption_code, "Code")}
              >
                <Copy aria-hidden />
              </Button>
            ) : null}
          </span>
        </Detail>
      ) : null}
      {method === "booking_link" && claim.redemption_url ? (
        <Detail label="Booking link">
          <a
            href={claim.redemption_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 break-all hover:underline"
          >
            {claim.redemption_url}
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
          </a>
        </Detail>
      ) : null}
      {claim.redemption_instructions ? (
        <Detail label="How to redeem" className="sm:col-span-2 lg:col-span-3">
          <RichText value={claim.redemption_instructions} />
        </Detail>
      ) : null}
    </>
  );
}

/** What the claim's status means for the reader right now. */
export function ClaimStatusCallout({
  claim,
  audience,
}: {
  claim: Pick<PartnerClaim, "status" | "expires_at" | "used_at">;
  audience: "employee" | "partner" | "admin";
}) {
  switch (claim.status) {
    case "active":
      return (
        <Alert>
          <Clock aria-hidden />
          <AlertTitle>
            {audience === "employee" ? "Ready to redeem" : "Active: can be confirmed"}
          </AlertTitle>
          <AlertDescription>
            {audience === "employee"
              ? `Show the reference to the partner before ${formatDateTime(claim.expires_at)}. They confirm the redemption; opening a link or showing a code does not.`
              : `Confirm it only when the employee redeems the offer, before ${formatDateTime(claim.expires_at)}.`}
          </AlertDescription>
        </Alert>
      );
    case "used":
      return (
        <Alert>
          <CheckCircle2 aria-hidden />
          <AlertTitle>Redeemed</AlertTitle>
          <AlertDescription>
            Use was confirmed {claim.used_at ? formatDateTime(claim.used_at) : ""}. It cannot be
            confirmed again.
          </AlertDescription>
        </Alert>
      );
    case "expired":
      return (
        <Alert>
          <TimerOff aria-hidden />
          <AlertTitle>Expired</AlertTitle>
          <AlertDescription>
            The offer ended {formatDateTime(claim.expires_at)} before the claim was redeemed. It can
            no longer be confirmed.
          </AlertDescription>
        </Alert>
      );
  }
}

/**
 * The marketplace answers 403 to anyone who is not an employee with a current employment.
 * That is eligibility, not a missing permission, so it gets its own explanation.
 */
export function MarketplaceErrorState({
  error,
  onRetry,
  history = false,
}: {
  error: unknown;
  onRetry?: () => void;
  /** Claim history stays readable after employment ends; only non-employees are refused. */
  history?: boolean;
}): ReactNode {
  if (error instanceof ApiError && error.isForbidden) {
    return (
      <EmptyState
        icon={UserX}
        title={history ? "Only employee accounts have claimed offers" : "Offers are for employees"}
        description={
          history
            ? "Sign in with your employee account to see the offers you claimed."
            : "Browsing and claiming offers needs an employee account whose employer is recorded by Aayulogic. If you recently changed employer, ask your administrator."
        }
      />
    );
  }
  return <ErrorState error={error} onRetry={onRetry} />;
}
