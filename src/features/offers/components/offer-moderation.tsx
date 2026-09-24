"use client";

import { ArrowLeft, BadgeCheck, MessageSquareWarning, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Button } from "@/design-system/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError, type Schemas } from "@/shared/api";
import { OrganizationAdminPermission, useCan } from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { ErrorState } from "@/shared/feedback/states";

import {
  useDecideOffer,
  useOfferForReview,
  useOffersForReview,
  type OfferDecision,
} from "../api/offers";
import { OffersTable, useStatusParam } from "./offers-list";
import { OfferSummary } from "./offer-summary";
import { PublicationPanel } from "./publication-panel";

type Offer = Schemas["OfferResponse"];

/** The moderation queue; defaults to offers waiting for review. */
export function OfferReviewQueue() {
  const { status, setStatus } = useStatusParam("submitted");
  const offers = useOffersForReview(status);
  return (
    <OffersTable
      offers={offers}
      hrefFor={(offer) => `/admin/offers/${offer.id}`}
      filter={status}
      onFilter={setStatus}
      emptyTitle="Nothing to review"
    />
  );
}

function BackToQueue() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/admin/offers">
        <ArrowLeft aria-hidden />
        Offer review
      </Link>
    </Button>
  );
}

export function OfferReview({ offerId }: { offerId: string }) {
  const offer = useOfferForReview(offerId);
  if (offer.isPending) {
    return (
      <div className="space-y-6">
        <BackToQueue />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (offer.isError) {
    return (
      <div className="space-y-6">
        <BackToQueue />
        {offer.error instanceof ApiError && offer.error.isNotFound ? (
          <EmptyState title="Offer not found" />
        ) : (
          <ErrorState error={offer.error} onRetry={() => void offer.refetch()} />
        )}
      </div>
    );
  }
  return <LoadedReview offer={offer.data} />;
}

const DECISIONS: Record<
  OfferDecision,
  { title: string; description: string; confirm: string; success: string }
> = {
  approve: {
    title: "Approve this content?",
    description:
      "Approves exactly this version. It goes live only while the Partner is verified and commercially eligible.",
    confirm: "Approve",
    success: "Content approved",
  },
  "request-changes": {
    title: "Request changes?",
    description: "The Partner sees your reason, edits the offer and resubmits it.",
    confirm: "Request changes",
    success: "Changes requested",
  },
  reject: {
    title: "Reject this offer?",
    description: "Rejection is final for this offer. The Partner sees your reason.",
    confirm: "Reject",
    success: "Offer rejected",
  },
};

function LoadedReview({ offer }: { offer: Offer }) {
  const decide = useDecideOffer(offer.id);
  const canReview = useCan(OrganizationAdminPermission.OFFER_REVIEW);
  const canViewOrganizations = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const [decision, setDecision] = useState<OfferDecision | null>(null);
  const reviewable = canReview && offer.status === "submitted";
  const copy = DECISIONS[decision ?? "approve"];

  return (
    <div className="space-y-6">
      <BackToQueue />
      <PageHeader
        title={offer.title}
        description={`Reviewing version ${offer.version}`}
        actions={
          reviewable ? (
            <>
              <Button variant="outline" onClick={() => setDecision("request-changes")}>
                <MessageSquareWarning aria-hidden />
                Request changes
              </Button>
              <Button variant="outline" onClick={() => setDecision("reject")}>
                <XCircle aria-hidden />
                Reject
              </Button>
              <Button onClick={() => setDecision("approve")}>
                <BadgeCheck aria-hidden />
                Approve
              </Button>
            </>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Publication gates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PublicationPanel publication={offer.publication} />
          <DetailList>
            <Detail label="Partner organization" className="sm:col-span-2 lg:col-span-3">
              {canViewOrganizations ? (
                <Link
                  href={`/admin/organizations/${offer.organization_id}`}
                  className="font-mono text-xs hover:underline"
                >
                  {offer.organization_id}
                </Link>
              ) : (
                <span className="font-mono text-xs">{offer.organization_id}</span>
              )}
            </Detail>
          </DetailList>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          <OfferSummary offer={offer} />
        </CardContent>
      </Card>

      <ReasonDialog
        open={decision !== null}
        onOpenChange={(open) => !open && setDecision(null)}
        title={copy.title}
        description={copy.description}
        confirmLabel={copy.confirm}
        destructive={decision === "reject"}
        onConfirm={async (reason) => {
          if (!decision) return;
          // The reviewed version: if the Partner changed it meanwhile, the API answers 409.
          await decide.mutateAsync({ decision, version: offer.version, reason });
          toast.success(copy.success);
        }}
      />
    </div>
  );
}
