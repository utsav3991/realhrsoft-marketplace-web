"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  EyeOff,
  History,
  PauseCircle,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { RichText } from "@/design-system/components/rich-text-editor";
import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Badge } from "@/design-system/primitives/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Detail, DetailList } from "@/shared/components/details";
import { QueryDataTable, type ResultsQuery } from "@/shared/components/query-data-table";
import type { PageState } from "@/shared/hooks/use-page-param";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDateTime } from "@/shared/lib/format";

import type { Offer, OfferDecision, PostedVia } from "../api/queries";
import { AUDIENCE_LABEL, REDEMPTION_LABEL } from "../schemas/offer";

export const POSTED_VIA_LABEL: Record<PostedVia, string> = {
  partner_portal: "Partner portal",
  admin_on_behalf: "Aayulogic on behalf",
};

const empty = (value: string | null | undefined) => value || "—";

/** Whether the offer can be edited now: never while in review or suspended. */
export function isEditable(offer: Offer): boolean {
  return offer.status !== "pending_review" && offer.status !== "suspended";
}

export function isSubmittable(offer: Offer): boolean {
  return ["draft", "changes_requested", "rejected"].includes(offer.status);
}

export function isWithdrawable(offer: Offer): boolean {
  return offer.status === "pending_review" || offer.status === "approved";
}

/** Only a badge: employees see the offer only while every publishing gate passes. */
export function VisibilityBadge({ offer }: { offer: Offer }) {
  return offer.visible_to_employees ? (
    <Badge intent="success" title="Every publishing gate passes now">
      Visible to employees
    </Badge>
  ) : (
    <Badge intent="outline" title="At least one publishing gate does not pass">
      <EyeOff aria-hidden />
      Hidden
    </Badge>
  );
}

export function OfferContentCard({ offer, action }: { offer: Offer; action?: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Offer</CardTitle>
          <CardDescription>
            Revision {offer.revision}. Any content change needs a new approval.
          </CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Title">{offer.title}</Detail>
          <Detail label="Benefit">{offer.benefit}</Detail>
          <Detail label="Category">
            {offer.category.name}
            {offer.category.is_active ? null : (
              <StatusBadge domain="offerCategory" status="retired" className="ml-2" />
            )}
          </Detail>
          <Detail label="Valid from">{formatDateTime(offer.valid_from)}</Detail>
          <Detail label="Valid until">{formatDateTime(offer.valid_until)}</Detail>
          <Detail label="Audience">
            {AUDIENCE_LABEL[offer.audience_type]}
            {offer.audience_organizations.length > 0
              ? `: ${offer.audience_organizations.map((o) => o.name).join(", ")}`
              : null}
          </Detail>
          <Detail label="Description" className="sm:col-span-2 lg:col-span-3">
            <RichText value={offer.description} />
          </Detail>
          <Detail label="Terms and conditions" className="sm:col-span-2 lg:col-span-3">
            <RichText value={offer.terms} />
          </Detail>
        </DetailList>
      </CardContent>
    </Card>
  );
}

/** Redemption secrets: owners and administrators only; employees get them by claiming. */
export function RedemptionCard({ offer }: { offer: Offer }) {
  const method = offer.redemption_method;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Redemption</CardTitle>
        <CardDescription>Employees receive these details only after they claim.</CardDescription>
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Method">
            {method === "custom" ? empty(offer.custom_method_name) : REDEMPTION_LABEL[method]}
          </Detail>
          {method === "promo_code" || method === "qr_code" ? (
            <Detail label={method === "qr_code" ? "QR code value" : "Promo code"}>
              <span className="font-mono">{empty(offer.redemption_code)}</span>
            </Detail>
          ) : null}
          {method === "booking_link" ? (
            <Detail label="Booking link">
              {offer.redemption_url ? (
                <a
                  href={offer.redemption_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {offer.redemption_url}
                </a>
              ) : (
                "—"
              )}
            </Detail>
          ) : null}
          {offer.redemption_instructions ? (
            <Detail label="Instructions" className="sm:col-span-2 lg:col-span-3">
              <RichText value={offer.redemption_instructions} />
            </Detail>
          ) : null}
        </DetailList>
      </CardContent>
    </Card>
  );
}

/** Lifecycle facts, provenance and the version every write must send. */
export function PublicationCard({ offer, partner }: { offer: Offer; partner?: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Publication</CardTitle>
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Status">
            <StatusBadge domain="offer" status={offer.display_status} />
          </Detail>
          <Detail label="Employees">
            <VisibilityBadge offer={offer} />
          </Detail>
          {partner ? <Detail label="Partner">{partner}</Detail> : null}
          <Detail label="Posted via">{POSTED_VIA_LABEL[offer.posted_via]}</Detail>
          <Detail label="Featured">{offer.is_featured ? "Yes" : "No"}</Detail>
          <Detail label="Submitted">
            {offer.submitted_at ? formatDateTime(offer.submitted_at) : "—"}
          </Detail>
          <Detail label="Approved">
            {offer.approved_at
              ? `${formatDateTime(offer.approved_at)} (revision ${offer.approved_revision})`
              : "—"}
          </Detail>
          <Detail label="First published">
            {offer.first_published_at ? formatDateTime(offer.first_published_at) : "—"}
          </Detail>
          <Detail label="Version">{offer.version}</Detail>
          <Detail label="Last updated">{formatDateTime(offer.updated_at)}</Detail>
        </DetailList>
      </CardContent>
    </Card>
  );
}

/**
 * What the status means for the reader right now. Returned and rejected offers show the
 * reviewer's feedback (latest_decision.reason), which the partner addresses before resubmitting.
 */
export function OfferStatusCallout({
  offer,
  audience,
  action,
}: {
  offer: Offer;
  audience: "partner" | "reviewer";
  action?: ReactNode;
}) {
  const feedback = offer.latest_decision?.reason || "No feedback was recorded.";
  const partner = audience === "partner";
  switch (offer.status) {
    case "changes_requested":
    case "rejected":
      return (
        <Alert variant={offer.status === "rejected" ? "destructive" : "default"}>
          {offer.status === "rejected" ? <XCircle aria-hidden /> : <AlertTriangle aria-hidden />}
          <AlertTitle>
            {offer.status === "rejected" ? "Offer rejected" : "Changes requested"}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="whitespace-pre-line">{feedback}</p>
            <p>
              {partner
                ? "Edit the offer to address this feedback, then submit it for review again."
                : "The partner can edit the offer and resubmit it."}
            </p>
            {action}
          </AlertDescription>
        </Alert>
      );
    case "pending_review":
      return (
        <Alert>
          <Clock aria-hidden />
          <AlertTitle>{partner ? "Awaiting Aayulogic review" : "Awaiting your review"}</AlertTitle>
          <AlertDescription>
            Submitted {offer.submitted_at ? formatDateTime(offer.submitted_at) : ""}.{" "}
            {partner
              ? "Withdraw it to draft if you need to change it."
              : "Approve, request changes or reject it at its current version."}
          </AlertDescription>
        </Alert>
      );
    case "suspended":
      return (
        <Alert variant="destructive">
          <PauseCircle aria-hidden />
          <AlertTitle>Suspended by Aayulogic</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="whitespace-pre-line">{feedback}</p>
            <p>Hidden from employees and locked for editing until it is reinstated.</p>
          </AlertDescription>
        </Alert>
      );
    case "approved":
      return offer.visible_to_employees ? (
        <Alert>
          <CheckCircle2 aria-hidden />
          <AlertTitle>Live for employees</AlertTitle>
          <AlertDescription>
            {partner
              ? "Editing it sends the new content for review and hides it until approved again."
              : "Employees in its audience can find and claim it now."}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <EyeOff aria-hidden />
          <AlertTitle>Approved, not visible</AlertTitle>
          <AlertDescription>
            {offer.display_status === "scheduled"
              ? `It becomes visible on ${formatDateTime(offer.valid_from)}.`
              : offer.display_status === "expired"
                ? "Its end date has passed."
                : offer.partner.status !== "verified"
                  ? "The partner is no longer verified; it shows again once re-verified."
                  : "Another publishing gate does not pass."}
          </AlertDescription>
        </Alert>
      );
    case "draft":
      return (
        <Alert>
          <Clock aria-hidden />
          <AlertTitle>Draft</AlertTitle>
          <AlertDescription>
            Not visible to employees.{" "}
            {partner ? "Submit it for Aayulogic review when it is ready." : null}
          </AlertDescription>
        </Alert>
      );
  }
}

const DECISION_COLUMNS: DataTableColumns<OfferDecision> = [
  {
    id: "outcome",
    header: "Outcome",
    cell: (decision) => (
      <>
        <StatusBadge domain="offerDecision" status={decision.outcome} />
        {decision.via === "admin_publish" ? (
          <span className="text-muted-foreground ml-2 text-xs">Published directly</span>
        ) : null}
      </>
    ),
  },
  {
    id: "reason",
    header: "Reason",
    cellClassName: "max-w-md whitespace-pre-line",
    cell: (decision) => empty(decision.reason),
  },
  {
    id: "revision",
    header: "Revision",
    cellClassName: "text-muted-foreground",
    cell: (decision) => decision.offer_revision,
  },
  {
    id: "decided",
    header: "Decided",
    cellClassName: "text-muted-foreground",
    cell: (decision) => formatDateTime(decision.decided_at),
  },
];

/** Every moderation decision, newest first, with the revision it covered. */
export function OfferDecisionHistory({
  decisions,
  paging,
}: {
  decisions: ResultsQuery<OfferDecision>;
  paging: PageState;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Decision history</CardTitle>
        <CardDescription>Every moderation decision, newest first.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <QueryDataTable
          aria-label="Decision history"
          query={decisions}
          paging={paging}
          columns={DECISION_COLUMNS}
          rowKey={(decision) => decision.id}
          skeletonRows={2}
          className="rounded-lg"
          empty={<EmptyState icon={History} title="No decisions yet" className="py-8" />}
        />
      </CardContent>
    </Card>
  );
}
