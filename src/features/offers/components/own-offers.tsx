"use client";

import {
  Archive,
  ArrowLeft,
  CloudOff,
  Lock,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  ShieldAlert,
  Tag,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { useOwnPartner } from "@/features/partners/api/queries";
import { ApiError } from "@/shared/api";
import { useSelectedOrganizationId, useSession } from "@/shared/auth";
import {
  PartnerOfferPermission,
  PartnerPermission,
  useCanInOrganization,
  type OrganizationPermissionCode,
} from "@/shared/authorization";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { formatDate } from "@/shared/lib/format";

import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";

import {
  useCreateOwnOffer,
  useOwnOfferAction,
  useUpdateOwnOffer,
  type OwnOfferAction,
} from "../api/mutations";
import {
  OWN_OFFER_SORTS,
  useOwnOffer,
  useOwnOfferDecisions,
  useOwnOffers,
  useOwnOfferVersions,
  type Offer,
} from "../api/queries";
import { benefitSummary } from "../schemas/benefit-value";
import { editableVersion, EMPTY_OFFER, offerBody, offerValues } from "../schemas/offer";
import { useOwnCategoryOptions } from "./category-options";
import {
  isEditable,
  isInReview,
  isPausable,
  isPublished,
  isResumable,
  isRetirable,
  isSubmittable,
  OfferDecisionHistory,
  OfferStatusCallout,
  OfferVersionHistory,
  OfferVersions,
  PublicationCard,
  shownVersion,
  validity,
  VisibilityBadge,
} from "./offer-details";
import { OfferForm, type IntentButton } from "./offer-form";
import { OFFER_STATUSES } from "./offers-directory";

const ALL = "all";

/** Whether the selected organization has a partner registration (any status). */
export function useIsPartner(): boolean {
  const { actor } = useSession();
  const organizationId = useSelectedOrganizationId();
  return Boolean(actor?.memberships.find((m) => m.organizationId === organizationId)?.partner);
}

export function NotAPartner({
  description = "Register the business and pass Aayulogic verification before posting offers.",
}: {
  description?: string;
}) {
  return (
    <EmptyState
      icon={Lock}
      title="Your organization is not a partner yet"
      description={description}
      action={
        <Button asChild variant="outline">
          <Link href="/partner">Open the partner dashboard</Link>
        </Button>
      }
    />
  );
}

/**
 * Offers can be created, submitted and published only for a verified partner. The status is
 * read when the member may view the profile; otherwise the API's answer is shown on save.
 */
function VerificationNotice() {
  const organizationId = useSelectedOrganizationId();
  const canViewProfile = useCanInOrganization(PartnerPermission.PROFILE_VIEW);
  const partner = useOwnPartner(organizationId, { enabled: canViewProfile });
  if (!partner.isSuccess || partner.data.status === "verified") return null;
  return (
    <Alert>
      <ShieldAlert aria-hidden />
      <AlertTitle>Verification needed</AlertTitle>
      <AlertDescription>
        Your partner registration is {partner.data.status}. Offers can be created and submitted once
        Aayulogic verifies it; existing offers stay hidden from employees until then.
      </AlertDescription>
    </Alert>
  );
}

function useIsVerified(): boolean | null {
  const organizationId = useSelectedOrganizationId();
  const canViewProfile = useCanInOrganization(PartnerPermission.PROFILE_VIEW);
  const partner = useOwnPartner(organizationId, { enabled: canViewProfile });
  return partner.isSuccess ? partner.data.status === "verified" : null;
}

/** The selected partner organization's offers. */
export function OwnOffers() {
  const { searchParams, set } = useUrlParams();
  const organizationId = useSelectedOrganizationId();
  const isPartner = useIsPartner();
  const statusParam = searchParams.get("status");
  const status = OFFER_STATUSES.find((s) => s.value === statusParam)?.value ?? null;
  const sort = useSortParam(OWN_OFFER_SORTS);
  const paging = usePageParam();
  const offers = useOwnOffers(organizationId, status, sort.value, paging);
  const canCreate = useCanInOrganization(PartnerOfferPermission.OFFER_CREATE);
  const verified = useIsVerified();

  if (!isPartner) return <NotAPartner />;

  const columns: DataTableColumns<RowOf<typeof offers>> = [
    {
      id: "offer",
      header: "Offer",
      cell: (offer) => {
        const version = shownVersion(offer);
        return (
          <>
            <Link href={`/partner/offers/${offer.id}`} className="font-medium hover:underline">
              {version?.title ?? "Untitled offer"}
            </Link>
            <p className="text-muted-foreground text-xs">
              {version ? benefitSummary(version.benefit) : null}
            </p>
          </>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: (offer) => <StatusBadge domain="offer" status={offer.display_status} />,
    },
    {
      id: "employees",
      header: "Employees",
      className: "hidden md:table-cell",
      cell: (offer) => <VisibilityBadge offer={offer} />,
    },
    {
      id: "valid",
      header: "Valid",
      cellClassName: "text-muted-foreground",
      cell: (offer) => {
        const version = shownVersion(offer);
        return version ? validity(version.valid_from, version.valid_until) : "—";
      },
    },
    {
      id: "updated",
      header: "Updated",
      sortKey: "updated_at",
      className: "hidden lg:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (offer) => formatDate(offer.updated_at),
    },
  ];
  return (
    <div className="space-y-4">
      <VerificationNotice />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={status ?? ALL}
          onValueChange={(value) => {
            set({ status: value === ALL ? null : value });
          }}
        >
          <SelectTrigger className="w-48" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {OFFER_STATUSES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canCreate && verified !== false ? (
          <Button asChild>
            <Link href="/partner/offers/new">
              <Plus aria-hidden />
              New offer
            </Link>
          </Button>
        ) : null}
      </div>

      <QueryDataTable
        aria-label="Offers"
        query={offers}
        columns={columns}
        sort={sort}
        paging={paging}
        rowKey={(offer) => offer.id}
        empty={
          <EmptyState
            icon={Tag}
            title={status ? "No offers with this status" : "No offers yet"}
            description={
              status ? "Try another status." : "Offers you create appear here with their status."
            }
          />
        }
      />
    </div>
  );
}

function BackToOwnOffers() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/partner/offers">
        <ArrowLeft aria-hidden />
        Offers
      </Link>
    </Button>
  );
}

/** Portal intents: save, plus submit when the member may submit and the status allows it. */
function usePortalIntents(saveLabel: string, submittable: boolean): IntentButton[] {
  const canSubmit = useCanInOrganization(PartnerOfferPermission.OFFER_SUBMIT);
  if (!canSubmit || !submittable) return [{ intent: "save", label: saveLabel, primary: true }];
  return [
    { intent: "save", label: saveLabel },
    { intent: "submit", label: "Save and submit for review", primary: true },
  ];
}

function PortalOfferForm({
  offer,
  intents,
  onSubmit,
  onCancel,
}: {
  offer?: Offer;
  intents: readonly IntentButton[];
  onSubmit: Parameters<typeof OfferForm>[0]["onSubmit"];
  onCancel?: () => void;
}): ReactNode {
  const organizationId = useSelectedOrganizationId();
  const categories = useOwnCategoryOptions(
    organizationId,
    offer ? editableVersion(offer)?.marketplace_policy?.category : undefined,
  );
  if (categories.query.isPending) return <Skeleton className="h-96 w-full" />;
  if (categories.query.isError) {
    return (
      <ErrorState error={categories.query.error} onRetry={() => void categories.query.refetch()} />
    );
  }
  return (
    <OfferForm
      defaultValues={offer ? offerValues(offer) : EMPTY_OFFER}
      categories={categories.options}
      intents={intents}
      reasonHint="Optional note, recorded in the audit log."
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}

/** Creating an offer for the selected partner organization. */
export function NewOwnOffer() {
  const router = useRouter();
  const organizationId = useSelectedOrganizationId();
  const isPartner = useIsPartner();
  const verified = useIsVerified();
  const create = useCreateOwnOffer(organizationId);
  const intents = usePortalIntents("Save draft", true);

  if (!isPartner) return <NotAPartner />;
  return (
    <div className="space-y-6">
      <BackToOwnOffers />
      {verified === false ? (
        <VerificationNotice />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>New offer</CardTitle>
            <CardDescription>
              Save it as a draft or submit it for Aayulogic review. Employees see it only once
              approved, enabled and inside its dates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortalOfferForm
              intents={intents}
              onSubmit={async (values, intent) => {
                const offer = await create.mutateAsync({
                  ...offerBody(values),
                  intent: intent === "submit" ? "submit" : "save",
                });
                toast.success(intent === "submit" ? "Offer submitted for review" : "Draft saved");
                router.push(`/partner/offers/${offer.id}`);
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** One of the selected organization's offers: status, feedback, edits and history. */
export function OwnOffer({ offerId }: { offerId: string }) {
  const organizationId = useSelectedOrganizationId();
  const offer = useOwnOffer(organizationId, offerId);

  if (offer.isPending) {
    return (
      <div className="space-y-6">
        <BackToOwnOffers />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (offer.isError) {
    return (
      <div className="space-y-6">
        <BackToOwnOffers />
        {offer.error instanceof ApiError && offer.error.isNotFound ? (
          <EmptyState title="Offer not found" />
        ) : (
          <ErrorState error={offer.error} onRetry={() => void offer.refetch()} />
        )}
      </div>
    );
  }
  return <OwnOfferWorkspace offer={offer.data} organizationId={organizationId} />;
}

interface OwnerActionSpec {
  label: string;
  icon: LucideIcon;
  permission: OrganizationPermissionCode;
  available: (offer: Offer) => boolean;
  title: string;
  description: string;
  confirmLabel: string;
  done: string;
  destructive?: boolean;
}

// In priority order: submit is the page's primary button, the rest go in the menu.
const OWNER_ACTIONS: Record<OwnOfferAction, OwnerActionSpec> = {
  submit: {
    label: "Submit for review",
    icon: Send,
    permission: PartnerOfferPermission.OFFER_SUBMIT,
    available: isSubmittable,
    title: "Submit for review?",
    description:
      "Aayulogic reviews the draft. It is frozen while it waits, but you can retract it. A live version stays live meanwhile.",
    confirmLabel: "Submit",
    done: "Submitted for review",
  },
  retract: {
    label: "Retract from review",
    icon: Undo2,
    permission: PartnerOfferPermission.OFFER_WITHDRAW,
    available: isInReview,
    title: "Retract from review?",
    description:
      "The review stops. The version stays frozen; edit the offer to start a new draft. A live version stays live.",
    confirmLabel: "Retract",
    done: "Retracted from review",
    destructive: true,
  },
  resume: {
    label: "Resume",
    icon: Play,
    permission: PartnerOfferPermission.OFFER_PAUSE,
    available: isResumable,
    title: "Resume this offer?",
    description:
      "Employees can see and claim it again while every other gate passes. An Aayulogic suspension stays in place.",
    confirmLabel: "Resume",
    done: "Offer resumed",
  },
  pause: {
    label: "Pause",
    icon: Pause,
    permission: PartnerOfferPermission.OFFER_PAUSE,
    available: isPausable,
    title: "Pause this offer?",
    description:
      "Employees stop seeing it and cannot claim it until you resume it. Accepted claims and issued vouchers are unaffected.",
    confirmLabel: "Pause",
    done: "Offer paused",
  },
  unpublish: {
    label: "Unpublish",
    icon: CloudOff,
    permission: PartnerOfferPermission.OFFER_WITHDRAW,
    available: isPublished,
    title: "Unpublish this offer?",
    description:
      "The live version goes offline (no new claims) and a draft copy is kept to edit and resubmit. Accepted claims and vouchers are unaffected.",
    confirmLabel: "Unpublish",
    done: "Offer unpublished",
    destructive: true,
  },
  retire: {
    label: "Retire",
    icon: Archive,
    permission: PartnerOfferPermission.OFFER_RETIRE,
    available: isRetirable,
    title: "Retire this offer?",
    description:
      "This is final: no new claims or edits. Accepted claims, issued vouchers and their history are kept.",
    confirmLabel: "Retire offer",
    done: "Offer retired",
    destructive: true,
  },
};

function useOwnerActions(offer: Offer): OwnOfferAction[] {
  const granted: Record<OwnOfferAction, boolean> = {
    submit: useCanInOrganization(OWNER_ACTIONS.submit.permission),
    retract: useCanInOrganization(OWNER_ACTIONS.retract.permission),
    resume: useCanInOrganization(OWNER_ACTIONS.resume.permission),
    pause: useCanInOrganization(OWNER_ACTIONS.pause.permission),
    unpublish: useCanInOrganization(OWNER_ACTIONS.unpublish.permission),
    retire: useCanInOrganization(OWNER_ACTIONS.retire.permission),
  };
  return (Object.keys(OWNER_ACTIONS) as OwnOfferAction[]).filter(
    (action) => granted[action] && OWNER_ACTIONS[action].available(offer),
  );
}

function OwnOfferWorkspace({ offer, organizationId }: { offer: Offer; organizationId: string }) {
  const canUpdate = useCanInOrganization(PartnerOfferPermission.OFFER_UPDATE);
  const canViewDecisions = useCanInOrganization(PartnerOfferPermission.OFFER_DECISION_VIEW);
  // The offer the edit started from: a background refetch must not turn a stale draft into an
  // overwrite of someone else's change (the API answers 409 instead).
  const [editingFrom, setEditingFrom] = useState<Offer | null>(null);
  const [acting, setActing] = useState<OwnOfferAction | null>(null);
  const update = useUpdateOwnOffer(organizationId, offer.id);
  const action = useOwnOfferAction(organizationId, offer.id);
  const intents = usePortalIntents("Save draft", true);
  const actions = useOwnerActions(offer);
  const version = shownVersion(offer);
  const spec = OWNER_ACTIONS[acting ?? "submit"];

  // Submit is the one primary button; everything else is in the menu.
  const primary = actions.find((a) => a === "submit");
  const menu = actions.filter((a) => a !== "submit");

  return (
    <div className="space-y-6">
      <BackToOwnOffers />
      <PageHeader
        title={version?.title ?? "Offer"}
        description={version?.headline}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="offer" status={offer.display_status} />
            {primary ? (
              <Button onClick={() => setActing(primary)}>
                <Send aria-hidden />
                {OWNER_ACTIONS[primary].label}
              </Button>
            ) : null}
            {menu.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menu.map((item) => {
                    const Icon = OWNER_ACTIONS[item].icon;
                    return (
                      <DropdownMenuItem key={item} onSelect={() => setActing(item)}>
                        <Icon aria-hidden />
                        {OWNER_ACTIONS[item].label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        }
      />
      <OfferStatusCallout offer={offer} audience="partner" />
      {editingFrom ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit offer</CardTitle>
            <CardDescription>
              Saving replaces every field of the working draft, or starts a new one.{" "}
              {editingFrom.current_version
                ? `Employees keep seeing version ${editingFrom.current_version.number} until Aayulogic approves the change.`
                : "Submit it when it is ready for review."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortalOfferForm
              offer={editingFrom}
              intents={intents}
              onCancel={() => setEditingFrom(null)}
              onSubmit={async (values, intent) => {
                await update.mutateAsync({
                  ...offerBody(values),
                  intent: intent === "submit" ? "submit" : "save",
                  expected_version: editingFrom.version,
                });
                toast.success(intent === "submit" ? "Saved and submitted" : "Draft saved");
                setEditingFrom(null);
              }}
            />
          </CardContent>
        </Card>
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
      <PublicationCard offer={offer} />
      <OwnVersions organizationId={organizationId} offerId={offer.id} />
      {canViewDecisions ? (
        <OwnDecisions organizationId={organizationId} offerId={offer.id} />
      ) : null}

      <ConfirmDialog
        open={acting !== null}
        onOpenChange={(open) => !open && setActing(null)}
        title={spec.title}
        description={spec.description}
        confirmLabel={spec.confirmLabel}
        destructive={spec.destructive}
        onConfirm={async () => {
          if (!acting) return;
          await action.mutateAsync({ action: acting, expected_version: offer.version, reason: "" });
          toast.success(spec.done);
        }}
      />
    </div>
  );
}

function OwnVersions({ organizationId, offerId }: { organizationId: string; offerId: string }) {
  const paging = usePageParam("versions_");
  return (
    <OfferVersionHistory
      versions={useOwnOfferVersions(organizationId, offerId, paging)}
      paging={paging}
    />
  );
}

function OwnDecisions({ organizationId, offerId }: { organizationId: string; offerId: string }) {
  const paging = usePageParam("decisions_");
  return (
    <OfferDecisionHistory
      decisions={useOwnOfferDecisions(organizationId, offerId, paging)}
      paging={paging}
    />
  );
}
