"use client";

import {
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
import { useOffer, useOfferDecisions, type Offer, type OfferStatus } from "../api/queries";
import { offerBody, offerValues } from "../schemas/offer";
import { useAdminCategoryOptions } from "./category-options";
import {
  isEditable,
  OfferContentCard,
  OfferDecisionHistory,
  OfferStatusCallout,
  PublicationCard,
  RedemptionCard,
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
  /** Statuses the API accepts this action from. */
  from: readonly OfferStatus[];
  title: string;
  description: string;
  confirmLabel: string;
  done: string;
  /** The API records an empty reason for these; the others need one. */
  optionalReason?: boolean;
  destructive?: boolean;
}

// In priority order: the first available action is the page's primary button.
const ACTIONS: Record<OfferAction, ActionSpec> = {
  approve: {
    label: "Approve",
    icon: Check,
    permission: OfferAdminPermission.OFFER_APPROVE,
    from: ["pending_review"],
    title: "Approve this offer?",
    description:
      "Approves the content at the revision you reviewed. Employees see it only while the partner is verified and the offer is inside its dates.",
    confirmLabel: "Approve offer",
    done: "Offer approved",
    optionalReason: true,
  },
  publish: {
    label: "Publish",
    icon: Upload,
    permission: OfferAdminPermission.OFFER_PUBLISH,
    from: ["draft", "changes_requested", "rejected"],
    title: "Publish this offer directly?",
    description:
      "Approves the current revision without a separate review, recorded as published by you. The partner must still be verified.",
    confirmLabel: "Publish offer",
    done: "Offer published",
    optionalReason: true,
  },
  reinstate: {
    label: "Reinstate",
    icon: Play,
    permission: OfferAdminPermission.OFFER_REINSTATE,
    from: ["suspended"],
    title: "Reinstate this offer?",
    description:
      "Returns it to approved at the same revision. The category must be active and the end date in the future.",
    confirmLabel: "Reinstate offer",
    done: "Offer reinstated",
  },
  "request-changes": {
    label: "Request changes",
    icon: MessageSquareWarning,
    permission: OfferAdminPermission.OFFER_REQUEST_CHANGES,
    from: ["pending_review"],
    title: "Request changes?",
    description: "The reason tells the partner what to change before resubmitting.",
    confirmLabel: "Request changes",
    done: "Changes requested",
  },
  reject: {
    label: "Reject",
    icon: X,
    permission: OfferAdminPermission.OFFER_REJECT,
    from: ["pending_review"],
    title: "Reject this offer?",
    description:
      "The reason is shown to the partner as feedback. They can still edit and resubmit it.",
    confirmLabel: "Reject offer",
    done: "Offer rejected",
    destructive: true,
  },
  submit: {
    label: "Submit for review",
    icon: Send,
    permission: OfferAdminPermission.OFFER_SUBMIT,
    from: ["draft", "changes_requested", "rejected"],
    title: "Submit for review on the partner's behalf?",
    description:
      "Moves it to pending review. The category must be active and the end date in the future.",
    confirmLabel: "Submit",
    done: "Offer submitted for review",
    optionalReason: true,
  },
  suspend: {
    label: "Suspend",
    icon: Pause,
    permission: OfferAdminPermission.OFFER_SUSPEND,
    from: ["approved"],
    title: "Suspend this offer?",
    description:
      "Hides it from employees immediately and locks it for editing until reinstated. The partner sees your reason.",
    confirmLabel: "Suspend offer",
    done: "Offer suspended",
    destructive: true,
  },
  withdraw: {
    label: "Withdraw to draft",
    icon: Undo2,
    permission: OfferAdminPermission.OFFER_WITHDRAW,
    from: ["pending_review", "approved"],
    title: "Withdraw to draft on the partner's behalf?",
    description: "Returns it to draft and hides it from employees. History is kept.",
    confirmLabel: "Withdraw",
    done: "Offer withdrawn to draft",
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
    suspend: useCan(ACTIONS.suspend.permission),
    withdraw: useCan(ACTIONS.withdraw.permission),
  };
  return (Object.keys(ACTIONS) as OfferAction[]).filter(
    (action) => granted[action] && ACTIONS[action].from.includes(offer.status),
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
  const [editing, setEditing] = useState(false);

  // Two buttons at most; the rest go in the menu. Only a non-destructive first is cobalt.
  const [primary, secondary, ...menu] = actions;

  return (
    <div className="space-y-6">
      <BackToOffers />
      <PageHeader
        title={offer.title}
        description={
          <span className="flex flex-wrap items-center gap-x-2">
            {canViewPartner ? (
              <Link href={`/admin/partners/${offer.partner.id}`} className="hover:underline">
                {offer.partner.business_name}
              </Link>
            ) : (
              offer.partner.business_name
            )}
            <span aria-hidden>·</span>
            {SOURCE_LABEL[offer.partner.source]}
          </span>
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
      {editing ? (
        <AssistedEdit offer={offer} onDone={() => setEditing(false)} />
      ) : (
        <OfferContentCard
          offer={offer}
          action={
            canUpdate && isEditable(offer) ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil aria-hidden />
                Edit
              </Button>
            ) : null
          }
        />
      )}
      <RedemptionCard offer={offer} />
      <PublicationCard offer={offer} partner={offer.partner.business_name} />
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

function Decisions({ offerId }: { offerId: string }) {
  const paging = usePageParam("decisions_");
  return <OfferDecisionHistory decisions={useOfferDecisions(offerId, paging)} paging={paging} />;
}

function AssistedEdit({ offer, onDone }: { offer: Offer; onDone: () => void }) {
  const update = useUpdateOffer(offer.id);
  const categories = useAdminCategoryOptions(offer.category);
  const approved = offer.status === "approved";
  const intents = useAdminIntents("Save changes", { submittable: !approved });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit offer</CardTitle>
        <CardDescription>
          Saving replaces every field.{" "}
          {approved
            ? "Changed content goes back to pending review unless you publish it."
            : `The status stays ${offer.status.replace("_", " ")} unless you submit or publish.`}
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
              toast.success(intent === "publish" ? "Offer saved and published" : "Offer saved");
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
        await mutation.mutateAsync({ action, reason, expected_version: offer.version });
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
