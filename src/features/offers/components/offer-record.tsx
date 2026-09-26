"use client";

import {
  CloudOff,
  Check,
  MessageSquareWarning,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Send,
  Star,
  StarOff,
  Ticket,
  Undo2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/design-system/primitives/dropdown-menu";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { SOURCE_LABEL } from "@/features/partners/components/partner-details";
import { ApiError } from "@/shared/api";
import {
  ClaimAdminPermission,
  OfferAdminPermission,
  PartnerAdminPermission,
  useCan,
  type GlobalPermissionCode,
} from "@/shared/authorization";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { usePageParam } from "@/shared/hooks/use-page-param";

import {
  useFeatureOffer,
  useOfferAction,
  useUpdateOffer,
  type OfferAction,
} from "../api/mutations";
import { useOffer, useOfferDecisions, useOfferVersions, type Offer } from "../api/queries";
import { editableVersion, offerBody, offerValues } from "../schemas/offer";
import { useAdminCategoryOptions } from "./category-options";
import {
  isAdminPublishable,
  isEditable,
  isInReview,
  isPublished,
  isSubmittable,
  isSuspended,
  OfferDecisionHistory,
  OfferStatusCallout,
  OfferVersionHistory,
  OfferVersions,
  PublicationCard,
  shownVersion,
} from "./offer-details";
import { OfferForm } from "./offer-form";
import { BackToOffers, useAdminIntents } from "./new-offer";
import { OrganizationPicker } from "./pickers";

/** One offer for Aayulogic review, publication and moderation. */
export function OfferRecord({ offerId }: { offerId: string }) {
  const offer = useOffer(offerId);

  if (offer.isPending) {
    return (
      <div className="space-y-6">
        <BackToOffers />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
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
  return <OfferWorkspace offer={offer.data} />;
}

interface ActionSpec {
  label: string;
  icon: LucideIcon;
  permission: GlobalPermissionCode;
  /** Whether the API accepts this action in the offer's current state. */
  available: (offer: Offer) => boolean;
  /** Decisions name the working version the reviewer read. */
  onVersion?: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  done: string;
  /** The API records an empty reason for these; the others need one. */
  optionalReason?: boolean;
  destructive?: boolean;
}

const notRetired = (offer: Offer) => offer.availability !== "retired";

// In priority order: the first available action is the page's primary button.
const ACTIONS: Record<OfferAction, ActionSpec> = {
  approve: {
    label: "Approve",
    icon: Check,
    permission: OfferAdminPermission.OFFER_APPROVE,
    available: isInReview,
    onVersion: true,
    title: "Approve this version?",
    description:
      "It becomes the live version at once, replacing any earlier one; claims keep the version they accepted. Employees see it only while the partner is verified and it is inside its dates.",
    confirmLabel: "Approve version",
    done: "Version approved",
    optionalReason: true,
  },
  publish: {
    label: "Publish",
    icon: Upload,
    permission: OfferAdminPermission.OFFER_PUBLISH,
    available: (offer) => isAdminPublishable(offer) && !isInReview(offer),
    onVersion: true,
    title: "Publish this version directly?",
    description:
      "Approves the working version without a separate review, recorded as published by you, and makes it live. The partner must still be verified.",
    confirmLabel: "Publish version",
    done: "Version published",
    optionalReason: true,
  },
  reinstate: {
    label: "Reinstate",
    icon: Play,
    permission: OfferAdminPermission.OFFER_REINSTATE,
    available: isSuspended,
    title: "Reinstate this offer?",
    description:
      "Lifts the suspension. Employees see it again if every other gate passes; the partner must be verified.",
    confirmLabel: "Reinstate offer",
    done: "Offer reinstated",
  },
  "request-changes": {
    label: "Request changes",
    icon: MessageSquareWarning,
    permission: OfferAdminPermission.OFFER_REQUEST_CHANGES,
    available: isInReview,
    onVersion: true,
    title: "Request changes?",
    description:
      "The reason tells the partner what to change in a new draft. A live version stays live.",
    confirmLabel: "Request changes",
    done: "Changes requested",
  },
  reject: {
    label: "Reject",
    icon: X,
    permission: OfferAdminPermission.OFFER_REJECT,
    available: isInReview,
    onVersion: true,
    title: "Reject this version?",
    description:
      "The reason is shown to the partner as feedback. A live version stays live, and the partner can edit into a new draft.",
    confirmLabel: "Reject version",
    done: "Version rejected",
    destructive: true,
  },
  submit: {
    label: "Submit for review",
    icon: Send,
    permission: OfferAdminPermission.OFFER_SUBMIT,
    available: isSubmittable,
    title: "Submit for review on the partner's behalf?",
    description:
      "Freezes the draft and moves it to review. The category must be active and the end date in the future.",
    confirmLabel: "Submit",
    done: "Version submitted for review",
    optionalReason: true,
  },
  retract: {
    label: "Retract from review",
    icon: Undo2,
    permission: OfferAdminPermission.OFFER_WITHDRAW,
    available: isInReview,
    title: "Retract this version from review?",
    description:
      "It becomes retracted and frozen; editing starts a new draft. A live version stays live.",
    confirmLabel: "Retract",
    done: "Version retracted",
    destructive: true,
  },
  unpublish: {
    label: "Unpublish",
    icon: CloudOff,
    permission: OfferAdminPermission.OFFER_WITHDRAW,
    available: isPublished,
    title: "Unpublish this offer?",
    description:
      "Takes the live version offline (no new claims) and keeps a draft copy to edit. Accepted claims and issued vouchers are unaffected. This is not retirement.",
    confirmLabel: "Unpublish",
    done: "Offer unpublished",
    destructive: true,
  },
  suspend: {
    label: "Suspend",
    icon: Pause,
    permission: OfferAdminPermission.OFFER_SUSPEND,
    available: (offer) => notRetired(offer) && !isSuspended(offer),
    title: "Suspend this offer?",
    description:
      "Hides it from employees whatever its partner does; editing, resuming or publishing never lifts it. Issued vouchers keep their terms. The partner sees your reason.",
    confirmLabel: "Suspend offer",
    done: "Offer suspended",
    destructive: true,
  },
};

function useAvailableActions(offer: Offer): OfferAction[] {
  const granted: Record<OfferAction, boolean> = {
    approve: useCan(ACTIONS.approve.permission),
    publish: useCan(ACTIONS.publish.permission),
    reinstate: useCan(ACTIONS.reinstate.permission),
    "request-changes": useCan(ACTIONS["request-changes"].permission),
    reject: useCan(ACTIONS.reject.permission),
    submit: useCan(ACTIONS.submit.permission),
    retract: useCan(ACTIONS.retract.permission),
    unpublish: useCan(ACTIONS.unpublish.permission),
    suspend: useCan(ACTIONS.suspend.permission),
  };
  return (Object.keys(ACTIONS) as OfferAction[]).filter(
    (action) => granted[action] && ACTIONS[action].available(offer),
  );
}

function OfferWorkspace({ offer }: { offer: Offer }) {
  const canUpdate = useCan(OfferAdminPermission.OFFER_UPDATE);
  const canFeature = useCan(OfferAdminPermission.OFFER_FEATURE);
  const canViewDecisions = useCan(OfferAdminPermission.OFFER_DECISION_VIEW);
  const canViewPartner = useCan(PartnerAdminPermission.PARTNER_VIEW);
  const canViewClaims = useCan(ClaimAdminPermission.CLAIM_VIEW);
  const actions = useAvailableActions(offer);
  const [acting, setActing] = useState<OfferAction | "feature" | null>(null);
  // The offer the edit started from: a background refetch must not turn a stale draft into an
  // overwrite of someone else's change (the API answers 409 instead).
  const [editingFrom, setEditingFrom] = useState<Offer | null>(null);
  const partner = offer.partner;

  // Two buttons at most; the rest go in the menu. Only a non-destructive first is cobalt.
  const [primary, secondary, ...menu] = actions;

  return (
    <div className="space-y-6">
      <BackToOffers />
      <PageHeader
        title={shownVersion(offer)?.title ?? "Offer"}
        description={
          partner ? (
            <span className="flex flex-wrap items-center gap-x-2">
              {canViewPartner ? (
                <Link href={`/admin/partners/${partner.id}`} className="hover:underline">
                  {partner.business_name}
                </Link>
              ) : (
                partner.business_name
              )}
              <span aria-hidden>·</span>
              {SOURCE_LABEL[partner.source]}
            </span>
          ) : null
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="offer" status={offer.display_status} />
            {canViewClaims ? (
              <Button asChild variant="outline">
                <Link href={`/admin/claims?offer_id=${offer.id}`}>
                  <Ticket aria-hidden />
                  Claims
                </Link>
              </Button>
            ) : null}
            {secondary ? (
              <ActionButton action={secondary} onClick={() => setActing(secondary)} />
            ) : null}
            {primary ? (
              <ActionButton
                action={primary}
                primary={!ACTIONS[primary].destructive}
                onClick={() => setActing(primary)}
              />
            ) : null}
            {menu.length > 0 || canFeature ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menu.map((action) => {
                    const Icon = ACTIONS[action].icon;
                    return (
                      <DropdownMenuItem key={action} onSelect={() => setActing(action)}>
                        <Icon aria-hidden />
                        {ACTIONS[action].label}
                      </DropdownMenuItem>
                    );
                  })}
                  {canFeature ? (
                    <DropdownMenuItem onSelect={() => setActing("feature")}>
                      {offer.is_featured ? <StarOff aria-hidden /> : <Star aria-hidden />}
                      {offer.is_featured ? "Remove from featured" : "Feature on marketplace"}
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        }
      />
      <OfferStatusCallout offer={offer} audience="reviewer" />
      {editingFrom ? (
        <AssistedEdit offer={editingFrom} onDone={() => setEditingFrom(null)} />
      ) : (
        <OfferVersions
          offer={offer}
          editAction={
            canUpdate && isEditable(offer) ? (
              <Button variant="outline" size="sm" onClick={() => setEditingFrom(offer)}>
                <Pencil aria-hidden />
                Edit
              </Button>
            ) : null
          }
        />
      )}
      <PublicationCard offer={offer} partner={partner?.business_name} />
      <Versions offerId={offer.id} />
      {canViewDecisions ? <Decisions offerId={offer.id} /> : null}
      <ActionDialog
        offer={offer}
        action={acting === "feature" ? null : acting}
        onClose={() => setActing(null)}
      />
      <FeatureDialog offer={offer} open={acting === "feature"} onClose={() => setActing(null)} />
    </div>
  );
}

function ActionButton({
  action,
  primary = false,
  onClick,
}: {
  action: OfferAction;
  primary?: boolean;
  onClick: () => void;
}) {
  const Icon = ACTIONS[action].icon;
  return (
    <Button variant={primary ? "default" : "outline"} onClick={onClick}>
      <Icon aria-hidden />
      {ACTIONS[action].label}
    </Button>
  );
}

function Versions({ offerId }: { offerId: string }) {
  const paging = usePageParam("versions_");
  return <OfferVersionHistory versions={useOfferVersions(offerId, paging)} paging={paging} />;
}

function Decisions({ offerId }: { offerId: string }) {
  const paging = usePageParam("decisions_");
  return <OfferDecisionHistory decisions={useOfferDecisions(offerId, paging)} paging={paging} />;
}

function AssistedEdit({ offer, onDone }: { offer: Offer; onDone: () => void }) {
  const update = useUpdateOffer(offer.id);
  const categories = useAdminCategoryOptions(editableVersion(offer)?.marketplace_policy?.category);
  const intents = useAdminIntents("Save draft");
  const live = offer.current_version;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit offer</CardTitle>
        <CardDescription>
          Saving replaces every field of the working draft, or starts one.{" "}
          {live
            ? `Version ${live.number} stays live until the new version is approved or published.`
            : "Submit or publish it when it is ready."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {categories.query.isError ? (
          <ErrorState
            error={categories.query.error}
            onRetry={() => void categories.query.refetch()}
          />
        ) : (
          <OfferForm
            defaultValues={offerValues(offer)}
            categories={categories.options}
            intents={intents}
            organizationPicker={(props) => <OrganizationPicker {...props} />}
            reasonHint="Optional note, recorded in the audit log."
            onCancel={onDone}
            onSubmit={async (values, intent) => {
              await update.mutateAsync({
                ...offerBody(values),
                intent,
                expected_version: offer.version,
              });
              toast.success(
                intent === "publish"
                  ? "Saved and published"
                  : intent === "submit"
                    ? "Saved and submitted for review"
                    : "Draft saved",
              );
              onDone();
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ActionDialog({
  offer,
  action,
  onClose,
}: {
  offer: Offer;
  action: OfferAction | null;
  onClose: () => void;
}) {
  const mutation = useOfferAction(offer.id);
  const spec = ACTIONS[action ?? "approve"];
  return (
    <ReasonDialog
      open={action !== null}
      onOpenChange={(open) => !open && onClose()}
      title={spec.title}
      description={spec.description}
      confirmLabel={spec.confirmLabel}
      destructive={spec.destructive}
      optional={spec.optionalReason}
      onConfirm={async (reason) => {
        if (!action) return;
        await mutation.mutateAsync({
          action,
          reason,
          expected_version: offer.version,
          version_id: spec.onVersion ? offer.working_version?.id : undefined,
        });
        toast.success(spec.done);
      }}
    />
  );
}

function FeatureDialog({
  offer,
  open,
  onClose,
}: {
  offer: Offer;
  open: boolean;
  onClose: () => void;
}) {
  const feature = useFeatureOffer(offer.id);
  const next = !offer.is_featured;
  return (
    <ReasonDialog
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={next ? "Feature this offer?" : "Remove from featured?"}
      description={
        next
          ? "Shows it in Featured offers on the marketplace home while every publishing gate passes. It does not change the content or approval."
          : "Removes it from Featured offers. It stays published."
      }
      confirmLabel={next ? "Feature offer" : "Remove from featured"}
      optional
      onConfirm={async (reason) => {
        await feature.mutateAsync({
          is_featured: next,
          reason,
          expected_version: offer.version,
        });
        toast.success(next ? "Offer featured" : "Offer removed from featured");
      }}
    />
  );
}
