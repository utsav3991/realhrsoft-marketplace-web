"use client";

import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  EyeOff,
  FilePen,
  History,
  PauseCircle,
  Undo2,
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
import { formatDate, formatDateTime } from "@/shared/lib/format";

import type { Availability, Offer, OfferDecision, OfferVersion, PostedVia } from "../api/queries";
import { benefitSummary } from "../schemas/benefit-value";
import { ACCEPTANCE_LABEL, AUDIENCE_LABEL, presentationLabel } from "../schemas/offer";

export const POSTED_VIA_LABEL: Record<PostedVia, string> = {
  partner_portal: "Partner portal",
  employer_portal: "Employer portal",
  admin_on_behalf: "Aayulogic on behalf",
};

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  enabled: "Enabled",
  paused: "Paused",
  retired: "Retired",
};

const DECISION_VIA_LABEL: Record<OfferDecision["via"], string> = {
  review: "Review",
  admin_publish: "Published by Aayulogic",
  owner_publish: "Published by the owner",
  moderation: "Moderation",
};

const empty = (value: string | null | undefined) => value || "—";

// --- Lifecycle guards: mirror the API's conflicts; the API still decides ---------------

const isRetired = (offer: Offer) => offer.availability === "retired";
export const isSuspended = (offer: Offer) => Boolean(offer.suspended_at);
const workingState = (offer: Offer) => offer.working_version?.state ?? null;

/**
 * Whether an edit can be saved: never once retired or while a version is under review (retract
 * it first). Saving a frozen working version or the live one starts a new draft.
 */
export function isEditable(offer: Offer): boolean {
  return !isRetired(offer) && workingState(offer) !== "in_review";
}

export const isSubmittable = (offer: Offer) =>
  !isRetired(offer) && workingState(offer) === "draft";
export const isInReview = (offer: Offer) => workingState(offer) === "in_review";
export const isPublished = (offer: Offer) => offer.current_version !== null;
export const isPausable = (offer: Offer) => offer.availability === "enabled";
export const isResumable = (offer: Offer) => offer.availability === "paused";
export const isRetirable = (offer: Offer) => !isRetired(offer);

/** Administrators publish any unpublished working version directly, in review or not. */
export function isAdminPublishable(offer: Offer): boolean {
  const state = workingState(offer);
  return !isRetired(offer) && state !== null && state !== "approved";
}

/** Only a badge: employees see the offer only while every publishing gate passes. */
export function VisibilityBadge({ offer }: { offer: Pick<Offer, "visible_to_employees"> }) {
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

/** "1 Oct 2026 – 31 Dec 2026", or "From 1 Oct 2026" when open-ended. */
export function validity(validFrom: string, validUntil: string | null): string {
  return validUntil
    ? `${formatDate(validFrom)} – ${formatDate(validUntil)}`
    : `From ${formatDate(validFrom)}`;
}

/** The version employees see, else the one being prepared; what lists and headers name. */
export function shownVersion(offer: Offer): OfferVersion | null {
  return offer.current_version ?? offer.working_version;
}

/**
 * One version's terms, including how the benefit is applied: owners and administrators only;
 * employees receive the codes, links and instructions with an issued voucher.
 */
export function VersionTermsCard({
  version,
  title,
  description,
  action,
}: {
  version: OfferVersion;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  const policy = version.marketplace_policy;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle className="flex flex-wrap items-center gap-2">
            {title}
            <StatusBadge domain="offerVersion" status={version.state} />
          </CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Title">{version.title}</Detail>
          <Detail label="Headline">{version.headline}</Detail>
          <Detail label="Benefit">
            {benefitSummary(version.benefit)}
            {version.benefit.type !== "descriptive" && version.benefit.description ? (
              <span className="text-muted-foreground block text-xs">
                {version.benefit.description}
              </span>
            ) : null}
          </Detail>
          {policy ? (
            <Detail label="Category">
              {policy.category.name}
              {policy.category.is_active ? null : (
                <StatusBadge domain="offerCategory" status="retired" className="ml-2" />
              )}
            </Detail>
          ) : null}
          <Detail label="Valid from">{formatDateTime(version.valid_from)}</Detail>
          <Detail label="Valid until">
            {version.valid_until ? formatDateTime(version.valid_until) : "Open-ended"}
          </Detail>
          {policy ? (
            <>
              <Detail label="Audience">
                {AUDIENCE_LABEL[policy.audience_type]}
                {policy.audience_organizations.length > 0
                  ? `: ${policy.audience_organizations.map((o) => o.name).join(", ")}`
                  : null}
              </Detail>
              <Detail label="Claims">
                {ACCEPTANCE_LABEL[policy.acceptance_mode]}
                {policy.approval_ttl_hours
                  ? ` within ${policy.approval_ttl_hours} hours`
                  : null}
              </Detail>
              <Detail label="Applied by">
                {presentationLabel(policy.presentation_method, policy.custom_method_name)}
              </Detail>
              {policy.presentation_method === "promo_code" ? (
                <Detail label="Promo code">
                  <span className="font-mono">{empty(policy.promo_code)}</span>
                </Detail>
              ) : null}
              {policy.presentation_method === "booking_link" ? (
                <Detail label="Booking link">
                  {policy.redemption_url ? (
                    <a
                      href={policy.redemption_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary break-all hover:underline"
                    >
                      {policy.redemption_url}
                    </a>
                  ) : (
                    "—"
                  )}
                </Detail>
              ) : null}
              {policy.redemption_instructions ? (
                <Detail label="Instructions" className="sm:col-span-2 lg:col-span-3">
                  <RichText value={policy.redemption_instructions} />
                </Detail>
              ) : null}
            </>
          ) : null}
          <Detail label="Description" className="sm:col-span-2 lg:col-span-3">
            <RichText value={version.description} />
          </Detail>
          <Detail label="Terms and conditions" className="sm:col-span-2 lg:col-span-3">
            {version.terms ? <RichText value={version.terms} /> : "—"}
          </Detail>
        </DetailList>
      </CardContent>
    </Card>
  );
}

/**
 * The live version and, when one is being prepared, the working version. While a replacement
 * is drafted or reviewed the live version stays live (D05), so both are shown.
 */
export function OfferVersions({ offer, editAction }: { offer: Offer; editAction?: ReactNode }) {
  const live = offer.current_version;
  const working = offer.working_version;
  return (
    <>
      {working ? (
        <VersionTermsCard
          version={working}
          title={live ? `Pending changes · version ${working.number}` : `Version ${working.number}`}
          description={
            working.state === "draft"
              ? live
                ? "A draft replacing the live version. Employees keep seeing the live terms until it is approved."
                : "Editable until it is submitted."
              : working.state === "in_review"
                ? "Frozen while Aayulogic reviews it."
                : "Frozen. Editing starts a new draft copied from it."
          }
          action={editAction}
        />
      ) : null}
      {live ? (
        <VersionTermsCard
          version={live}
          title={`Live · version ${live.number}`}
          description="The approved terms employees see. Claims keep the version they accepted."
          action={working ? undefined : editAction}
        />
      ) : null}
    </>
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
          <Detail label="Availability">{AVAILABILITY_LABEL[offer.availability]}</Detail>
          {partner ? <Detail label="Partner">{partner}</Detail> : null}
          <Detail label="Posted via">{POSTED_VIA_LABEL[offer.posted_via]}</Detail>
          <Detail label="Featured">{offer.is_featured ? "Yes" : "No"}</Detail>
          <Detail label="Live version">
            {offer.current_version ? offer.current_version.number : "None"}
          </Detail>
          <Detail label="First published">
            {offer.first_published_at ? formatDateTime(offer.first_published_at) : "—"}
          </Detail>
          {offer.suspended_at ? (
            <Detail label="Suspended">{formatDateTime(offer.suspended_at)}</Detail>
          ) : null}
          {offer.retired_at ? (
            <Detail label="Retired">{formatDateTime(offer.retired_at)}</Detail>
          ) : null}
          <Detail label="Last updated">{formatDateTime(offer.updated_at)}</Detail>
          <Detail label="Record version">{offer.version}</Detail>
        </DetailList>
      </CardContent>
    </Card>
  );
}

/**
 * What the offer's state means for the reader right now. Returned and rejected versions show
 * the reviewer's feedback (latest_decision.reason), which the partner addresses in a new draft.
 */
export function OfferStatusCallout({
  offer,
  audience,
}: {
  offer: Offer;
  audience: "partner" | "reviewer";
}) {
  const partner = audience === "partner";
  const live = offer.current_version;
  const working = offer.working_version;
  const liveNote = live ? ` The live version ${live.number} stays live meanwhile.` : "";

  if (isRetired(offer)) {
    return (
      <Alert>
        <Archive aria-hidden />
        <AlertTitle>Retired</AlertTitle>
        <AlertDescription>
          Final: no new claims or edits. Accepted claims and issued vouchers are kept.
        </AlertDescription>
      </Alert>
    );
  }
  if (isSuspended(offer)) {
    return (
      <Alert variant="destructive">
        <PauseCircle aria-hidden />
        <AlertTitle>Suspended by Aayulogic</AlertTitle>
        <AlertDescription className="space-y-2">
          <p className="whitespace-pre-line">{offer.suspension_reason || "No reason recorded."}</p>
          <p>
            Hidden from employees. Editing, resuming or publishing does not lift it; only a
            reinstatement does.
          </p>
        </AlertDescription>
      </Alert>
    );
  }
  if (offer.availability === "paused") {
    return (
      <Alert>
        <PauseCircle aria-hidden />
        <AlertTitle>Paused</AlertTitle>
        <AlertDescription>
          {partner
            ? "Hidden from employees until you resume it. Accepted claims and vouchers are unaffected."
            : "The partner paused it; employees cannot see or claim it until it is resumed."}
        </AlertDescription>
      </Alert>
    );
  }
  switch (working?.state) {
    case "in_review":
      return (
        <Alert>
          <Clock aria-hidden />
          <AlertTitle>
            {partner ? "Awaiting Aayulogic review" : "Awaiting your review"}
          </AlertTitle>
          <AlertDescription>
            Version {working.number} was submitted{" "}
            {working.submitted_at ? formatDateTime(working.submitted_at) : ""}.
            {liveNote}{" "}
            {partner
              ? "Retract it if you need to change it."
              : "Approve, request changes or reject this version."}
          </AlertDescription>
        </Alert>
      );
    case "changes_requested":
    case "rejected": {
      const rejected = working.state === "rejected";
      return (
        <Alert variant={rejected ? "destructive" : "default"}>
          {rejected ? <XCircle aria-hidden /> : <AlertTriangle aria-hidden />}
          <AlertTitle>{rejected ? "Version rejected" : "Changes requested"}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="whitespace-pre-line">
              {offer.latest_decision?.reason || "No feedback was recorded."}
            </p>
            <p>
              {partner
                ? "Edit the offer to start a new draft that addresses this feedback, then submit it."
                : "The partner can edit it into a new draft and resubmit."}
              {liveNote}
            </p>
          </AlertDescription>
        </Alert>
      );
    }
    case "retracted":
      return (
        <Alert>
          <Undo2 aria-hidden />
          <AlertTitle>Taken out of review</AlertTitle>
          <AlertDescription>
            Version {working.number} was retracted. Edit it to start a new draft.{liveNote}
          </AlertDescription>
        </Alert>
      );
    case "draft":
      return (
        <Alert>
          <FilePen aria-hidden />
          <AlertTitle>{live ? "Unsubmitted changes" : "Draft"}</AlertTitle>
          <AlertDescription>
            {live
              ? `Version ${working.number} is a draft; employees keep seeing version ${live.number}.`
              : "Not visible to employees."}{" "}
            {partner ? "Submit it for Aayulogic review when it is ready." : null}
          </AlertDescription>
        </Alert>
      );
    default:
      break;
  }
  if (!live) return null;
  if (offer.visible_to_employees) {
    return (
      <Alert>
        <CheckCircle2 aria-hidden />
        <AlertTitle>Live for employees</AlertTitle>
        <AlertDescription>
          {partner
            ? "Edits go into a new draft for review; employees keep the live terms until it is approved."
            : "Employees in its audience can find and claim it now."}
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert>
      <EyeOff aria-hidden />
      <AlertTitle>Published, not visible</AlertTitle>
      <AlertDescription>
        {offer.display_status === "scheduled"
          ? `It becomes visible on ${formatDateTime(live.valid_from)}.`
          : offer.display_status === "expired"
            ? "Its end date has passed."
            : offer.partner && offer.partner.status !== "verified"
              ? "The partner is no longer verified; it shows again once re-verified."
              : "Another publishing gate does not pass."}
      </AlertDescription>
    </Alert>
  );
}

const DECISION_COLUMNS: DataTableColumns<OfferDecision> = [
  {
    id: "outcome",
    header: "Outcome",
    cell: (decision) => (
      <>
        <StatusBadge domain="offerDecision" status={decision.outcome} />
        <span className="text-muted-foreground ml-2 text-xs">
          {DECISION_VIA_LABEL[decision.via]}
        </span>
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
    id: "version",
    header: "Version",
    cellClassName: "text-muted-foreground",
    cell: (decision) => decision.version_number ?? "—",
  },
  {
    id: "decided",
    header: "Decided",
    cellClassName: "text-muted-foreground",
    cell: (decision) => formatDateTime(decision.decided_at),
  },
];

/** Every publication and moderation decision, newest first, with the version it covered. */
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
        <CardDescription>Every publication and moderation decision, newest first.</CardDescription>
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

const VERSION_COLUMNS: DataTableColumns<OfferVersion> = [
  {
    id: "number",
    header: "Version",
    cellClassName: "tabular-nums",
    cell: (version) => version.number,
  },
  {
    id: "state",
    header: "State",
    cell: (version) => <StatusBadge domain="offerVersion" status={version.state} />,
  },
  {
    id: "terms",
    header: "Terms",
    cell: (version) => (
      <>
        <p className="font-medium">{version.headline}</p>
        <p className="text-muted-foreground text-xs">{benefitSummary(version.benefit)}</p>
      </>
    ),
  },
  {
    id: "valid",
    header: "Valid",
    className: "hidden md:table-cell",
    cellClassName: "text-muted-foreground",
    cell: (version) => validity(version.valid_from, version.valid_until),
  },
  {
    id: "frozen",
    header: "Frozen",
    className: "hidden lg:table-cell",
    cellClassName: "text-muted-foreground",
    cell: (version) => (version.frozen_at ? formatDateTime(version.frozen_at) : "—"),
  },
];

/** Every version with its frozen terms, newest first; claims keep the version they accepted. */
export function OfferVersionHistory({
  versions,
  paging,
}: {
  versions: ResultsQuery<OfferVersion>;
  paging: PageState;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Version history</CardTitle>
        <CardDescription>
          Frozen versions never change; claims keep the version they accepted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <QueryDataTable
          aria-label="Version history"
          query={versions}
          paging={paging}
          columns={VERSION_COLUMNS}
          rowKey={(version) => version.id}
          skeletonRows={2}
          className="rounded-lg"
          empty={<EmptyState icon={History} title="No versions yet" className="py-8" />}
        />
      </CardContent>
    </Card>
  );
}
