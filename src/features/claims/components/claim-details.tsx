"use client";

import {
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  TimerOff,
  UserX,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { RichText } from "@/design-system/components/rich-text-editor";
import { EmptyState } from "@/design-system/components/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import { presentationLabel } from "@/features/offers/schemas/offer";
import { ApiError, type Schemas } from "@/shared/api";
import { Detail } from "@/shared/components/details";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";

import type { ClaimDecision } from "../api/mutations";
import type { ClaimStatus, OwnClaim, Voucher } from "../api/queries";

export const CLAIM_STATUSES: readonly { value: ClaimStatus; label: string }[] = [
  { value: "requested", label: "Awaiting approval" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export function claimStatusFrom(value: string | null): ClaimStatus | null {
  return CLAIM_STATUSES.find((s) => s.value === value)?.value ?? null;
}

export const DECISION_SOURCE_LABEL: Record<Schemas["ClaimDecisionSourceEnum"], string> = {
  policy: "Accepted automatically",
  partner: "The partner",
  admin: "Aayulogic",
  beneficiary: "The employee",
  system: "Deadline passed",
};

function copy(value: string, what: string) {
  navigator.clipboard.writeText(value).then(
    () => toast.success(`${what} copied`),
    () => toast.error(`Could not copy the ${what.toLowerCase()}`),
  );
}

function Copyable({ value, what, className }: { value: string; what: string; className: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={className}>{value}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label={`Copy ${what.toLowerCase()}`}
        onClick={() => copy(value, what)}
      >
        <Copy aria-hidden />
      </Button>
    </span>
  );
}

/** The voucher's short reference, which a cashier can type when the QR cannot be scanned. */
export function VoucherReference({
  reference,
  copyable = false,
}: {
  reference: string;
  copyable?: boolean;
}) {
  const className = "font-mono text-lg font-bold tracking-[0.2em]";
  return copyable ? (
    <Copyable value={reference} what="Reference" className={className} />
  ) : (
    <span className={className}>{reference}</span>
  );
}

/**
 * The voucher an accepted claim issued, with how to apply the benefit, frozen at acceptance.
 * Showing a code or opening a link does not use it: the partner confirms the use.
 */
export function VoucherDetails({
  voucher,
  usable = false,
}: {
  voucher: Voucher;
  /** The owner's view while it can be used: codes can be copied. */
  usable?: boolean;
}) {
  const presentation = voucher.presentation;
  const method = presentation.method;
  return (
    <>
      <Detail label="Voucher">
        <StatusBadge domain="voucher" status={voucher.status} />
      </Detail>
      <Detail label="Reference">
        <VoucherReference reference={voucher.reference} copyable={usable} />
      </Detail>
      <Detail label="Usable">
        {formatDateTime(voucher.valid_from)} – {formatDateTime(voucher.valid_until)}
      </Detail>
      <Detail label="Applied by">
        {presentationLabel(method, presentation.custom_method_name)}
      </Detail>
      {method === "promo_code" && presentation.promo_code ? (
        <Detail label="Promo code">
          {usable ? (
            <Copyable value={presentation.promo_code} what="Code" className="font-mono text-base font-bold" />
          ) : (
            <span className="font-mono">{presentation.promo_code}</span>
          )}
        </Detail>
      ) : null}
      {method === "booking_link" && presentation.redemption_url ? (
        <Detail label="Booking link">
          <a
            href={presentation.redemption_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 break-all hover:underline"
          >
            {presentation.redemption_url}
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
          </a>
        </Detail>
      ) : null}
      {voucher.used_at ? <Detail label="Used">{formatDateTime(voucher.used_at)}</Detail> : null}
      {voucher.redemption?.reversed_at ? (
        <Detail label="Use corrected">{formatDateTime(voucher.redemption.reversed_at)}</Detail>
      ) : null}
      {presentation.redemption_instructions ? (
        <Detail label="How to use it" className="sm:col-span-2 lg:col-span-3">
          <RichText value={presentation.redemption_instructions} />
        </Detail>
      ) : null}
    </>
  );
}

/** What the claim's decision means for the reader right now. */
export function ClaimStatusCallout({
  claim,
  audience,
}: {
  claim: Pick<OwnClaim, "status" | "decision_deadline" | "decision" | "voucher">;
  audience: "employee" | "partner" | "admin";
}) {
  const reason = claim.decision?.reason;
  switch (claim.status) {
    case "requested":
      return (
        <Alert>
          <Clock aria-hidden />
          <AlertTitle>
            {audience === "employee" ? "Awaiting the partner's approval" : "Awaiting a decision"}
          </AlertTitle>
          <AlertDescription>
            {audience === "employee"
              ? "No voucher yet: the partner accepts or rejects your request"
              : "Accepting issues the voucher; rejecting shows your reason to the employee. Decide"}
            {claim.decision_deadline
              ? ` before ${formatDateTime(claim.decision_deadline)}, or it expires.`
              : "."}
          </AlertDescription>
        </Alert>
      );
    case "accepted":
      return (
        <Alert>
          <CheckCircle2 aria-hidden />
          <AlertTitle>Accepted</AlertTitle>
          <AlertDescription>
            {claim.voucher
              ? audience === "employee"
                ? "Your voucher is ready. Show its reference to the business; they confirm the use."
                : "A voucher was issued. The business confirms its use when the employee presents it."
              : "One use of the benefit was recorded."}
          </AlertDescription>
        </Alert>
      );
    case "rejected":
      return (
        <Alert variant="destructive">
          <XCircle aria-hidden />
          <AlertTitle>Rejected</AlertTitle>
          <AlertDescription className="whitespace-pre-line">
            {reason || "No reason was given."}
          </AlertDescription>
        </Alert>
      );
    case "expired":
      return (
        <Alert>
          <TimerOff aria-hidden />
          <AlertTitle>Expired</AlertTitle>
          <AlertDescription>
            No decision was made before the deadline, so no voucher was issued.
          </AlertDescription>
        </Alert>
      );
    case "cancelled":
      return (
        <Alert>
          <Ban aria-hidden />
          <AlertTitle>Cancelled</AlertTitle>
          <AlertDescription>
            {audience === "employee" ? "You withdrew the request." : "The employee withdrew the request."}
          </AlertDescription>
        </Alert>
      );
  }
}

/** One accept or reject attempt; its Idempotency-Key is reused if the attempt is retried. */
export interface DecisionAttempt {
  decision: ClaimDecision;
  idempotencyKey: string;
}

export function decisionAttempt(decision: ClaimDecision): DecisionAttempt {
  return { decision, idempotencyKey: crypto.randomUUID() };
}

/**
 * Accept or reject one pending claim. `acceptReasonRequired` covers administrators, who must
 * justify an acceptance too.
 */
export function DecisionDialog({
  attempt,
  onClose,
  onDecide,
  acceptReasonRequired = false,
}: {
  attempt: DecisionAttempt | null;
  onClose: () => void;
  onDecide: (attempt: DecisionAttempt & { reason: string }) => Promise<unknown>;
  acceptReasonRequired?: boolean;
}) {
  const accept = attempt?.decision === "accept";
  return (
    <ReasonDialog
      open={attempt !== null}
      onOpenChange={(open) => !open && onClose()}
      title={accept ? "Accept this claim?" : "Reject this claim?"}
      description={
        accept
          ? "The employee's voucher is issued now, with the terms of the version they requested. This is not confirming its use."
          : "No voucher is issued. The employee sees your reason, so keep it free of internal details. They cannot request this offer again."
      }
      confirmLabel={accept ? "Accept claim" : "Reject claim"}
      destructive={!accept}
      optional={accept && !acceptReasonRequired}
      onConfirm={async (reason) => {
        if (!attempt) return;
        await onDecide({ ...attempt, reason });
        toast.success(accept ? "Claim accepted" : "Claim rejected");
      }}
    />
  );
}

/** The decision recorded on a claim: who or what decided, when, and the reason. */
export function DecisionFacts({ claim }: { claim: Pick<OwnClaim, "decision"> }): ReactNode {
  const decision = claim.decision;
  if (!decision) return null;
  return (
    <>
      <Detail label="Decided by">{DECISION_SOURCE_LABEL[decision.source]}</Detail>
      <Detail label="Decided">{formatDateTime(decision.decided_at)}</Detail>
      {decision.reason ? (
        <Detail label="Reason" className="sm:col-span-2 lg:col-span-3">
          <span className="whitespace-pre-line">{decision.reason}</span>
        </Detail>
      ) : null}
    </>
  );
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
