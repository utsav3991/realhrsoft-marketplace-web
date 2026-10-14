"use client";

import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FilePen,
  History,
  ImageOff,
  PauseCircle,
  Undo2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Badge } from "@/design-system/primitives/badge";
import { Button, buttonVariants } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { useOffer, useOwnOffer } from "@/features/offers/api/queries";
import { shownVersion } from "@/features/offers/components/offer-details";
import {
  OfferAdminPermission,
  PartnerOfferPermission,
  useCan,
  useCanInOrganization,
} from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { QueryDataTable, type ResultsQuery } from "@/shared/components/query-data-table";
import { StatusBadge } from "@/shared/components/status-badge";
import type { PageState } from "@/shared/hooks/use-page-param";
import { formatDateTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";

import {
  useAssetImage,
  workspacePath,
  type AdDecision,
  type AdRevision,
  type Advertisement,
  type Workspace,
} from "../api/queries";
import {
  creativeView,
  CREATIVE_LABEL,
  DEFAULT_ACTION_LABEL,
  DESTINATION_LABEL,
  destinationView,
  type AdPageContent,
  type CreativeView,
} from "../schemas/advertisement";
import { SURFACE_LABEL } from "../schemas/catalogue";
import { AdPageView } from "./ad-page";

export const POSTED_VIA_LABEL: Record<Advertisement["posted_via"], string> = {
  partner_portal: "Partner portal",
  admin_on_behalf: "Aayulogic on behalf",
};

// --- Lifecycle guards: mirror the API's conflicts; the API still decides ---------------

const workingState = (ad: Advertisement) => ad.working_revision?.state ?? null;
export const isArchived = (ad: Advertisement) => ad.availability === "archived";
export const isSuspended = (ad: Advertisement) => ad.suspended;
export const isInReview = (ad: Advertisement) => workingState(ad) === "in_review";

/** Saving writes the working draft, or starts one; a revision under review is retracted first. */
export function isEditable(ad: Advertisement): boolean {
  return !isArchived(ad) && ad.campaign.status !== "archived" && !isInReview(ad);
}
export const isSubmittable = (ad: Advertisement) => workingState(ad) === "draft" && isEditable(ad);
export const isPausable = (ad: Advertisement) => ad.availability === "active";
export const isResumable = (ad: Advertisement) => ad.availability === "paused";
export const isArchivable = (ad: Advertisement) => !isArchived(ad);

/** A campaign or flight window as one line. */
export function windowLabel(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt && !endsAt) return "Always on";
  if (!startsAt) return `Until ${formatDateTime(endsAt ?? "")}`;
  if (!endsAt) return `From ${formatDateTime(startsAt)}`;
  return `${formatDateTime(startsAt)} – ${formatDateTime(endsAt)}`;
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href={href}>
        <ArrowLeft aria-hidden />
        {label}
      </Link>
    </Button>
  );
}

// --- Creative ----------------------------------------------------------------------------

/** A private creative image, fetched with the session's token. */
export function AssetImage({
  workspace,
  assetId,
  alt,
  className,
}: {
  workspace: Workspace;
  assetId: string | null;
  alt: string;
  className?: string;
}) {
  const image = useAssetImage(workspace, assetId);
  if (!assetId || image.isError) {
    return (
      <div
        className={cn(
          "bg-muted text-muted-foreground flex items-center justify-center gap-2 rounded-lg text-xs",
          className,
        )}
      >
        <ImageOff className="size-4" aria-hidden />
        {assetId ? "Image unavailable" : "No image"}
      </div>
    );
  }
  if (!image.data) return <Skeleton className={cn("rounded-lg", className)} />;
  // A data: URL of an authenticated download: next/image cannot load it.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={image.data} alt={alt} className={cn("rounded-lg object-cover", className)} />;
}

/**
 * How the creative reads. This is the owner's and reviewer's preview, not the marketplace
 * rendering, which belongs to serving.
 */
export function CreativePreview({
  workspace,
  creative,
}: {
  workspace: Workspace;
  creative: CreativeView;
}) {
  return (
    <figure className="bg-card max-w-xl overflow-hidden rounded-2xl border">
      {creative.type === "image_banner" ? (
        <AssetImage
          workspace={workspace}
          assetId={creative.assetId}
          alt={creative.altText}
          className="aspect-[4/1] w-full rounded-none"
        />
      ) : null}
      {creative.headline || creative.body || creative.ctaLabel ? (
        <figcaption className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0 space-y-1">
            {creative.headline ? <p className="font-semibold">{creative.headline}</p> : null}
            {creative.body ? (
              <p className="text-muted-foreground text-sm">{creative.body}</p>
            ) : null}
          </div>
          {creative.ctaLabel ? (
            <span className="bg-secondary text-secondary-foreground rounded-lg px-3 py-1.5 text-sm">
              {creative.ctaLabel}
            </span>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

// --- Destination -------------------------------------------------------------------------

function OfferDestination({ workspace, offerId }: { workspace: Workspace; offerId: string }) {
  return workspace.kind === "admin" ? (
    <AdminOfferDestination offerId={offerId} />
  ) : (
    <OwnOfferDestination organizationId={workspace.organizationId} offerId={offerId} />
  );
}

function OfferLink({ href, title }: { href: string; title: string | null }) {
  return (
    <Link href={href} className="text-primary hover:underline">
      {title ?? "Offer"}
    </Link>
  );
}

function AdminOfferDestination({ offerId }: { offerId: string }) {
  const canView = useCan(OfferAdminPermission.OFFER_VIEW);
  if (!canView) return <span className="font-mono text-xs">{offerId}</span>;
  return <AdminOfferTitle offerId={offerId} />;
}

function AdminOfferTitle({ offerId }: { offerId: string }) {
  const offer = useOffer(offerId);
  return (
    <OfferLink
      href={`/admin/offers/${offerId}`}
      title={offer.data ? (shownVersion(offer.data)?.title ?? null) : null}
    />
  );
}

function OwnOfferDestination({
  organizationId,
  offerId,
}: {
  organizationId: string;
  offerId: string;
}) {
  const canView = useCanInOrganization(PartnerOfferPermission.OFFER_VIEW);
  if (!canView) return <span className="font-mono text-xs">{offerId}</span>;
  return <OwnOfferTitle organizationId={organizationId} offerId={offerId} />;
}

function OwnOfferTitle({ organizationId, offerId }: { organizationId: string; offerId: string }) {
  const offer = useOwnOffer(organizationId, offerId);
  return (
    <OfferLink
      href={`/partner/offers/${offerId}`}
      title={offer.data ? (shownVersion(offer.data)?.title ?? null) : null}
    />
  );
}

function ExternalLink({ url }: { url: string }) {
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary break-all hover:underline"
    >
      {url}
    </a>
  ) : (
    "—"
  );
}

export function DestinationDetail({
  workspace,
  revision,
}: {
  workspace: Workspace;
  revision: AdRevision;
}) {
  const destination = destinationView(revision);
  switch (destination.type) {
    case "offer":
      return destination.offerId ? (
        <OfferDestination workspace={workspace} offerId={destination.offerId} />
      ) : (
        "—"
      );
    case "external_url":
      return <ExternalLink url={destination.url} />;
    case "ad_page":
      return destination.page.title || "—";
  }
}

/** Where an advertisement page's button leads, as the owner and reviewer read it. */
function PageButtonDetail({ workspace, page }: { workspace: Workspace; page: AdPageContent }) {
  if (page.action === "none") return "No button";
  return (
    <span className="space-y-1">
      <span className="block">{page.actionLabel || DEFAULT_ACTION_LABEL[page.action]}</span>
      <span className="block text-xs">
        {page.action === "offer" ? (
          page.offerId ? (
            <OfferDestination workspace={workspace} offerId={page.offerId} />
          ) : (
            "—"
          )
        ) : (
          <ExternalLink url={page.url} />
        )}
      </span>
    </span>
  );
}

/**
 * The advertisement page as employees will see it, built from the revision on the record.
 * The button is shown but inert here; its target is listed under the preview.
 */
export function AdPagePreview({
  workspace,
  creative,
  page,
  sponsor,
}: {
  workspace: Workspace;
  creative: CreativeView;
  page: AdPageContent;
  sponsor: string;
}) {
  return (
    <section aria-label="Employee view" className="space-y-3">
      <p className="kicker text-muted-foreground">Employee view</p>
      <div className="bg-background rounded-2xl border p-4 sm:p-6">
        <AdPageView
          preview
          sponsor={sponsor}
          title={page.title}
          body={page.body}
          image={
            creative.type === "image_banner" ? (
              <AssetImage
                workspace={workspace}
                assetId={creative.assetId}
                alt={creative.altText}
                className="max-h-80 w-full rounded-none"
              />
            ) : null
          }
          action={
            page.action === "none" ? null : (
              <span className={buttonVariants({ variant: "ink", size: "lg" })}>
                {page.actionLabel || DEFAULT_ACTION_LABEL[page.action]}
                <ArrowUpRight aria-hidden />
              </span>
            )
          }
        />
      </div>
      <p className="text-muted-foreground text-xs font-medium">
        Employees open this page from the advertisement. The sponsor shows as the partner&apos;s
        business name.
      </p>
    </section>
  );
}

// --- Revisions ---------------------------------------------------------------------------

export function RevisionCard({
  workspace,
  revision,
  title,
  description,
  action,
  sponsor,
}: {
  workspace: Workspace;
  revision: AdRevision;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** The owner's name for the page preview. */
  sponsor: string;
}) {
  const creative = creativeView(revision);
  const destination = destinationView(revision);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle className="flex flex-wrap items-center gap-2">
            {title}
            <StatusBadge domain="adRevision" status={revision.state} />
          </CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="space-y-6">
        <CreativePreview workspace={workspace} creative={creative} />
        {destination.type === "ad_page" ? (
          <AdPagePreview
            workspace={workspace}
            creative={creative}
            page={destination.page}
            sponsor={sponsor}
          />
        ) : null}
        <DetailList>
          <Detail label="Creative">{CREATIVE_LABEL[creative.type]}</Detail>
          {creative.type === "image_banner" ? (
            <Detail label="Alt text">{creative.altText || "—"}</Detail>
          ) : null}
          <Detail label={`Destination · ${DESTINATION_LABEL[destination.type]}`}>
            <DestinationDetail workspace={workspace} revision={revision} />
          </Detail>
          {destination.type === "ad_page" ? (
            <Detail label="Page button">
              <PageButtonDetail workspace={workspace} page={destination.page} />
            </Detail>
          ) : null}
          <Detail label="Placements" className="sm:col-span-2 lg:col-span-3">
            {revision.slots.length === 0 ? (
              "—"
            ) : (
              <ul className="flex flex-wrap gap-2">
                {revision.slots.map((slot) => (
                  <li key={slot.id}>
                    <Badge intent="outline" title={`${slot.key} · ${SURFACE_LABEL[slot.surface]}`}>
                      {slot.name}
                      {slot.is_active ? null : " (inactive)"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Detail>
          {revision.submitted_at ? (
            <Detail label="Submitted">{formatDateTime(revision.submitted_at)}</Detail>
          ) : null}
          {revision.frozen_at ? (
            <Detail label="Frozen">{formatDateTime(revision.frozen_at)}</Detail>
          ) : null}
        </DetailList>
      </CardContent>
    </Card>
  );
}

/**
 * The approved revision and, when one is being prepared, the working revision. The approved
 * revision keeps serving while a replacement is drafted or reviewed (Q21), so both show.
 */
export function AdRevisions({
  workspace,
  ad,
  editAction,
}: {
  workspace: Workspace;
  ad: Advertisement;
  editAction?: ReactNode;
}) {
  const live = ad.current_revision;
  const working = ad.working_revision;
  if (!live && !working) {
    return (
      <Card>
        <CardContent>
          <EmptyState icon={FilePen} title="No content yet" action={editAction} />
        </CardContent>
      </Card>
    );
  }
  return (
    <>
      {working ? (
        <RevisionCard
          workspace={workspace}
          revision={working}
          title={
            live ? `Pending changes · revision ${working.number}` : `Revision ${working.number}`
          }
          description={
            working.state === "draft"
              ? live
                ? "A draft replacing the approved revision, which keeps serving until this one is approved."
                : "Editable until it is submitted."
              : working.state === "in_review"
                ? "Frozen while Aayulogic reviews it."
                : "Frozen. Editing starts a new draft copied from it."
          }
          action={editAction}
          sponsor={ad.owner_organization.name}
        />
      ) : null}
      {live ? (
        <RevisionCard
          workspace={workspace}
          revision={live}
          title={`Approved · revision ${live.number}`}
          description="The reviewed content that may serve while the campaign runs."
          action={working ? undefined : editAction}
          sponsor={ad.owner_organization.name}
        />
      ) : null}
    </>
  );
}

/** What the advertisement's state means now, and what to do next. */
export function AdStatusCallout({
  ad,
  audience,
  feedback,
}: {
  ad: Advertisement;
  audience: "partner" | "reviewer";
  /** The latest review decision's reason, when the working revision was declined. */
  feedback?: string;
}) {
  const partner = audience === "partner";
  const live = ad.current_revision;
  const working = ad.working_revision;
  const liveNote = live ? ` Approved revision ${live.number} keeps serving meanwhile.` : "";

  if (isArchived(ad)) {
    return (
      <Alert>
        <Archive aria-hidden />
        <AlertTitle>Archived</AlertTitle>
        <AlertDescription>Final: it is never served again and cannot be edited.</AlertDescription>
      </Alert>
    );
  }
  if (isSuspended(ad)) {
    return (
      <Alert variant="destructive">
        <PauseCircle aria-hidden />
        <AlertTitle>Suspended by Aayulogic</AlertTitle>
        <AlertDescription className="space-y-2">
          <p className="whitespace-pre-line">{ad.suspension_reason || "No reason recorded."}</p>
          <p>Not served, whatever its owner does; only a reinstatement lifts it.</p>
        </AlertDescription>
      </Alert>
    );
  }
  if (ad.availability === "paused") {
    return (
      <Alert>
        <PauseCircle aria-hidden />
        <AlertTitle>Paused</AlertTitle>
        <AlertDescription>
          {partner
            ? "Not served until you resume it."
            : "Its owner paused it; it is not served until resumed."}
        </AlertDescription>
      </Alert>
    );
  }
  if (ad.campaign.status !== "active") {
    return (
      <Alert>
        <PauseCircle aria-hidden />
        <AlertTitle>Campaign {ad.campaign.status}</AlertTitle>
        <AlertDescription>
          Every advertisement in {ad.campaign.name} is hidden while the campaign is{" "}
          {ad.campaign.status}.
        </AlertDescription>
      </Alert>
    );
  }
  switch (working?.state) {
    case "in_review":
      return (
        <Alert>
          <Clock aria-hidden />
          <AlertTitle>{partner ? "Awaiting Aayulogic review" : "Awaiting your review"}</AlertTitle>
          <AlertDescription>
            Revision {working.number} was submitted{" "}
            {working.submitted_at ? formatDateTime(working.submitted_at) : ""}.{liveNote}{" "}
            {partner
              ? "Retract it if you need to change it."
              : "Approve, request changes or reject this revision."}
          </AlertDescription>
        </Alert>
      );
    case "changes_requested":
    case "rejected": {
      const rejected = working.state === "rejected";
      return (
        <Alert variant={rejected ? "destructive" : "default"}>
          {rejected ? <XCircle aria-hidden /> : <AlertTriangle aria-hidden />}
          <AlertTitle>{rejected ? "Revision rejected" : "Changes requested"}</AlertTitle>
          <AlertDescription className="space-y-3">
            {feedback !== undefined ? (
              <p className="whitespace-pre-line">{feedback || "No feedback was recorded."}</p>
            ) : null}
            <p>
              {partner
                ? "Edit the advertisement to start a new draft that addresses this, then submit it."
                : "The owner can edit it into a new draft and resubmit."}
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
            Revision {working.number} was retracted. Edit it to start a new draft.{liveNote}
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
              ? `Revision ${working.number} is a draft; revision ${live.number} keeps serving.`
              : "Not served until Aayulogic approves it."}{" "}
            {partner ? "Submit it for review when it is ready." : null}
          </AlertDescription>
        </Alert>
      );
    default:
      break;
  }
  if (!live) return null;
  return (
    <Alert>
      <CheckCircle2 aria-hidden />
      <AlertTitle>Approved</AlertTitle>
      <AlertDescription>
        It may serve in its placements while the campaign and its flights run. Serving also checks
        the destination for each viewer.
      </AlertDescription>
    </Alert>
  );
}

// --- Histories ---------------------------------------------------------------------------

const DECISION_COLUMNS: DataTableColumns<AdDecision> = [
  {
    id: "outcome",
    header: "Outcome",
    cell: (decision) => <StatusBadge domain="adDecision" status={decision.outcome} />,
  },
  {
    id: "reason",
    header: "Reason",
    cellClassName: "max-w-md whitespace-pre-line",
    cell: (decision) => decision.reason || "—",
  },
  {
    id: "revision",
    header: "Revision",
    cellClassName: "text-muted-foreground tabular-nums",
    cell: (decision) => decision.revision_number ?? "—",
  },
  {
    id: "decided",
    header: "Decided",
    cellClassName: "text-muted-foreground",
    cell: (decision) => formatDateTime(decision.decided_at),
  },
];

export function AdDecisionHistory({
  decisions,
  paging,
}: {
  decisions: ResultsQuery<AdDecision>;
  paging: PageState;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Decision history</CardTitle>
        <CardDescription>Review decisions and suspensions, newest first.</CardDescription>
      </CardHeader>
      <CardContent>
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

const REVISION_COLUMNS: DataTableColumns<AdRevision> = [
  {
    id: "number",
    header: "Revision",
    cellClassName: "tabular-nums",
    cell: (revision) => revision.number,
  },
  {
    id: "state",
    header: "State",
    cell: (revision) => <StatusBadge domain="adRevision" status={revision.state} />,
  },
  {
    id: "content",
    header: "Content",
    cell: (revision) => {
      const creative = creativeView(revision);
      return (
        <>
          <p className="font-medium">{creative.headline || creative.altText || "—"}</p>
          <p className="text-muted-foreground text-xs">
            {CREATIVE_LABEL[creative.type]} · {revision.slots.map((s) => s.name).join(", ")}
          </p>
        </>
      );
    },
  },
  {
    id: "frozen",
    header: "Frozen",
    className: "hidden lg:table-cell",
    cellClassName: "text-muted-foreground",
    cell: (revision) => (revision.frozen_at ? formatDateTime(revision.frozen_at) : "—"),
  },
];

export function AdRevisionHistory({
  revisions,
  paging,
}: {
  revisions: ResultsQuery<AdRevision>;
  paging: PageState;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revision history</CardTitle>
        <CardDescription>Frozen revisions never change; newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        <QueryDataTable
          aria-label="Revision history"
          query={revisions}
          paging={paging}
          columns={REVISION_COLUMNS}
          rowKey={(revision) => revision.id}
          skeletonRows={2}
          className="rounded-lg"
          empty={<EmptyState icon={History} title="No revisions yet" className="py-8" />}
        />
      </CardContent>
    </Card>
  );
}

/** Links to an advertisement in the workspace. */
export function adHref(workspace: Workspace, adId: string): string {
  return `${workspacePath(workspace)}/advertisements/${adId}`;
}

export function campaignHref(workspace: Workspace, campaignId: string): string {
  return `${workspacePath(workspace)}/campaigns/${campaignId}`;
}
