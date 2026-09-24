"use client";

import { ArrowLeft, Pencil, Send, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { useSelectedOrganizationId } from "@/shared/auth";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Button } from "@/design-system/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError, type Schemas } from "@/shared/api";
import { PartnerPermission, useCanInOrganization } from "@/shared/authorization";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ErrorState } from "@/shared/feedback/states";

import { usePartnerOffer, useSubmitOffer, useUpdateOffer, useWithdrawOffer } from "../api/offers";
import { offerBody, offerValues } from "../schemas/offer";
import { OfferForm } from "./offer-form";
import { OfferSummary } from "./offer-summary";
import { PublicationPanel } from "./publication-panel";

type Offer = Schemas["OfferResponse"];

const EDITABLE = new Set(["draft", "changes_requested"]);
const WITHDRAWABLE = new Set(["submitted", "approved"]);

function BackToOffers() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/partner/offers">
        <ArrowLeft aria-hidden />
        Offers
      </Link>
    </Button>
  );
}

export function PartnerOfferDetail({ offerId }: { offerId: string }) {
  const organizationId = useSelectedOrganizationId();
  const offer = usePartnerOffer(organizationId, offerId);
  if (offer.isPending) {
    return (
      <div className="space-y-6">
        <BackToOffers />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (offer.isError) {
    return (
      <div className="space-y-6">
        <BackToOffers />
        {offer.error instanceof ApiError && offer.error.isNotFound ? (
          <EmptyState title="Offer not found" />
        ) : (
          <ErrorState error={offer.error} onRetry={() => void offer.refetch()} />
        )}
      </div>
    );
  }
  return <LoadedOffer organizationId={organizationId} offer={offer.data} />;
}

type Transition = "submit" | "withdraw";

const COPY: Record<Transition, { title: string; description: string; confirm: string }> = {
  submit: {
    title: "Submit for review?",
    description:
      "Aayulogic reviews exactly this version. It cannot be edited while in review, and approval alone does not publish it.",
    confirm: "Submit for review",
  },
  withdraw: {
    title: "Withdraw this offer?",
    description:
      "It returns to draft and goes offline. After editing, it needs a new review before it can be live again.",
    confirm: "Withdraw",
  },
};

function LoadedOffer({ organizationId, offer }: { organizationId: string; offer: Offer }) {
  const [editing, setEditing] = useState(false);
  const [transition, setTransition] = useState<Transition | null>(null);
  const update = useUpdateOffer(organizationId, offer.id);
  const submit = useSubmitOffer(organizationId, offer.id);
  const withdraw = useWithdrawOffer(organizationId, offer.id);
  const canEdit = useCanInOrganization(PartnerPermission.OFFER_EDIT);
  const canSubmit = useCanInOrganization(PartnerPermission.OFFER_SUBMIT);
  const canWithdraw = useCanInOrganization(PartnerPermission.OFFER_WITHDRAW);
  const editable = EDITABLE.has(offer.status);
  const copy = COPY[transition ?? "submit"];

  return (
    <div className="space-y-6">
      <BackToOffers />
      <PageHeader
        title={offer.title}
        actions={
          <>
            {canEdit && editable && !editing ? (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil aria-hidden />
                Edit
              </Button>
            ) : null}
            {canWithdraw && WITHDRAWABLE.has(offer.status) ? (
              <Button variant="outline" onClick={() => setTransition("withdraw")}>
                <Undo2 aria-hidden />
                Withdraw
              </Button>
            ) : null}
            {canSubmit && editable && !editing ? (
              <Button onClick={() => setTransition("submit")}>
                <Send aria-hidden />
                Submit for review
              </Button>
            ) : null}
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Marketplace visibility</CardTitle>
        </CardHeader>
        <CardContent>
          <PublicationPanel publication={offer.publication} />
        </CardContent>
      </Card>

      {editing ? (
        <OfferForm
          title="Edit offer"
          initial={offerValues(offer)}
          submitLabel="Save changes"
          actions={
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          }
          onSubmit={async (values) => {
            await update.mutateAsync({ ...offerBody(values), version: offer.version });
            toast.success("Offer saved");
            setEditing(false);
          }}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <OfferSummary offer={offer} />
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={transition !== null}
        onOpenChange={(open) => !open && setTransition(null)}
        title={copy.title}
        description={copy.description}
        confirmLabel={copy.confirm}
        destructive={transition === "withdraw"}
        onConfirm={async () => {
          const mutation = transition === "withdraw" ? withdraw : submit;
          await mutation.mutateAsync({ version: offer.version });
          toast.success(transition === "withdraw" ? "Offer withdrawn" : "Submitted for review");
        }}
      />
    </div>
  );
}
