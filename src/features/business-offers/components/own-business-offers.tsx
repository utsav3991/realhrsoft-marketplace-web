"use client";

import {
  Archive,
  ArrowLeft,
  BriefcaseBusiness,
  CloudOff,
  Inbox,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
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
import type { OwnOfferAction } from "@/features/offers/api/mutations";
import type { Offer } from "@/features/offers/api/queries";
import { benefitSummary } from "@/features/offers/schemas/benefit-value";
import { editableVersion } from "@/features/offers/schemas/offer";
import { categoryOptions } from "@/features/offers/components/category-options";
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
} from "@/features/offers/components/offer-details";
import type { IntentButton } from "@/features/offers/components/offer-form";
import { OFFER_STATUSES } from "@/features/offers/components/offers-directory";
import { ApiError } from "@/shared/api";
import { useSelectedOrganizationId, useSession } from "@/shared/auth";
import {
  BusinessOfferPermission,
  useCanInOrganization,
  type OrganizationPermissionCode,
} from "@/shared/authorization";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatDate } from "@/shared/lib/format";

import {
  useCreateOwnBusinessOffer,
  useOwnBusinessOfferAction,
  useUpdateOwnBusinessOffer,
} from "../api/mutations";
import {
  BUSINESS_OFFER_SORTS,
  useOwnBusinessCategories,
  useOwnBusinessOfferDecisions,
  useOwnBusinessOffers,
  useOwnBusinessOfferVersions,
  useOwnBusinessOffer,
} from "../api/queries";
import {
  businessOfferBody,
  businessOfferValues,
  EMPTY_BUSINESS_OFFER,
} from "../schemas/business-offer";
import { BusinessOfferForm } from "./business-offer-form";
import { BusinessDirectoryPicker } from "./business-directory-picker";

const ALL = "all";

/** Why the switch is off-limits: vouchers are partner-bound, so only a partner post may use it. */
const EMPLOYER_ONLY =
  "Only an offer posted as a verified partner can be shown to employees, because the partner confirms their vouchers.";

/** The selected organization's capacities, as listed in its membership. */
function useSelectedMembership() {
  const { actor } = useSession();
  const organizationId = useSelectedOrganizationId();
  return actor?.memberships.find((m) => m.organizationId === organizationId);
}

/** The selected organization's business offers. */
export function OwnBusinessOffers() {
  const { searchParams, set } = useUrlParams();
  const organizationId = useSelectedOrganizationId();
  const statusParam = searchParams.get("status");
  const status = OFFER_STATUSES.find((s) => s.value === statusParam)?.value ?? null;
  const sort = useSortParam(BUSINESS_OFFER_SORTS);
  const paging = usePageParam();
  const offers = useOwnBusinessOffers(
    organizationId,
    {
      search: searchParams.get("search") ?? "",
      status,
      inReview: null,
      showToEmployees: null,
      partnerId: null,
      organizationId: null,
      ordering: sort.value,
    },
    paging,
  );
  const canCreate = useCanInOrganization(BusinessOfferPermission.OFFER_CREATE);
  const canViewLeads = useCanInOrganization(BusinessOfferPermission.RECEIVED_ENQUIRY_VIEW);

  const columns: DataTableColumns<RowOf<typeof offers>> = [
    {
      id: "offer",
      header: "Offer",
      cell: (offer) => {
        const version = shownVersion(offer);
        return (
          <>
            <Link href={`/business/offers/${offer.id}`} className="font-medium hover:underline">
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
      id: "organizations",
      header: "Organizations",
      className: "hidden md:table-cell",
      cell: (offer) => (
        <VisibilityBadge visible={offer.visible_to_businesses} viewers="organizations" />
      ),
    },
    {
      id: "employees",
      header: "Employees",
      className: "hidden lg:table-cell",
      cell: (offer) =>
        shownVersion(offer)?.business_policy?.show_to_employees ? (
          <VisibilityBadge offer={offer} />
        ) : (
          <span className="text-muted-foreground">Organizations only</span>
        ),
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={status ?? ALL}
          onValueChange={(value) => set({ status: value === ALL ? null : value })}
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
        <div className="flex flex-wrap gap-2">
          {canViewLeads ? (
            <Button asChild variant="outline">
              <Link href="/business/leads">
                <Inbox aria-hidden />
                Leads
              </Link>
            </Button>
          ) : null}
          {canCreate ? (
            <Button asChild>
              <Link href="/business/offers/new">
                <Plus aria-hidden />
                New business offer
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <QueryDataTable
        aria-label="Business offers"
        query={offers}
        columns={columns}
        sort={sort}
        paging={paging}
        rowKey={(offer) => offer.id}
        empty={
          <EmptyState
            icon={BriefcaseBusiness}
            title={status ? "No business offers with this status" : "No business offers yet"}
            description={
              status
                ? "Try another status."
                : "Offer your products or services to other organizations. Aayulogic reviews each one before it goes live."
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
      <Link href="/business/offers">
        <ArrowLeft aria-hidden />
        Business offers
      </Link>
    </Button>
  );
}

/** Portal intents: save, plus submit when the member may submit. */
function usePortalIntents(): IntentButton[] {
  const canSubmit = useCanInOrganization(BusinessOfferPermission.OFFER_SUBMIT);
  if (!canSubmit) return [{ intent: "save", label: "Save draft", primary: true }];
  return [
    { intent: "save", label: "Save draft" },
    { intent: "submit", label: "Save and submit for review", primary: true },
  ];
}

function PortalBusinessOfferForm({
  offer,
  onSubmit,
  onCancel,
}: {
  offer?: Offer;
  onSubmit: Parameters<typeof BusinessOfferForm>[0]["onSubmit"];
  onCancel?: () => void;
}): ReactNode {
  const organizationId = useSelectedOrganizationId();
  const membership = useSelectedMembership();
  const intents = usePortalIntents();
  const categories = categoryOptions(
    useOwnBusinessCategories(organizationId),
    offer ? editableVersion(offer)?.business_policy?.category : undefined,
  );
  if (categories.query.isPending) return <Skeleton className="h-96 w-full" />;
  if (categories.query.isError) {
    return (
      <ErrorState error={categories.query.error} onRetry={() => void categories.query.refetch()} />
    );
  }
  // An existing offer keeps the capacity it was posted in; a new one uses the partner capacity
  // when the organization has a partner registration (the API requires it to be verified).
  const asPartner = offer ? offer.partner !== null : Boolean(membership?.partner);
  return (
    <BusinessOfferForm
      defaultValues={offer ? businessOfferValues(offer) : EMPTY_BUSINESS_OFFER}
      categories={categories.options}
      intents={intents}
      organizationPicker={(props) => <BusinessDirectoryPicker {...props} />}
      employeeSwitchBlocked={asPartner ? null : EMPLOYER_ONLY}
      reasonHint="Optional note, recorded in the audit log."
      promoCodeLocked={Boolean(offer?.first_published_at)}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}

/** Creating a business offer for the selected organization. */
export function NewOwnBusinessOffer() {
  const router = useRouter();
  const organizationId = useSelectedOrganizationId();
  const membership = useSelectedMembership();
  const create = useCreateOwnBusinessOffer(organizationId);

  return (
    <div className="space-y-6">
      <BackToOwnOffers />
      <Card>
        <CardHeader>
          <CardTitle>New business offer</CardTitle>
          <CardDescription>
            {membership?.partner
              ? "Posted as your partner business, which must be verified."
              : "Posted as your employer organization."}{" "}
            Save it as a draft or submit it for Aayulogic review. Organizations see it only once
            approved, enabled and inside its dates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PortalBusinessOfferForm
            onSubmit={async (values, intent) => {
              const offer = await create.mutateAsync({
                ...businessOfferBody(values),
                intent: intent === "submit" ? "submit" : "save",
              });
              toast.success(intent === "submit" ? "Offer submitted for review" : "Draft saved");
              router.push(`/business/offers/${offer.id}`);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/** One of the selected organization's business offers: status, feedback, edits and history. */
export function OwnBusinessOffer({ offerId }: { offerId: string }) {
  const organizationId = useSelectedOrganizationId();
  const offer = useOwnBusinessOffer(organizationId, offerId);

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
          <EmptyState title="Business offer not found" />
        ) : (
          <ErrorState error={offer.error} onRetry={() => void offer.refetch()} />
        )}
      </div>
    );
  }
  return <OwnBusinessOfferWorkspace offer={offer.data} organizationId={organizationId} />;
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
    permission: BusinessOfferPermission.OFFER_SUBMIT,
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
    permission: BusinessOfferPermission.OFFER_WITHDRAW,
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
    permission: BusinessOfferPermission.OFFER_PAUSE,
    available: isResumable,
    title: "Resume this offer?",
    description:
      "Organizations (and employees, if shown to them) can see it again while every other gate passes. An Aayulogic suspension stays in place.",
    confirmLabel: "Resume",
    done: "Offer resumed",
  },
  pause: {
    label: "Pause",
    icon: Pause,
    permission: BusinessOfferPermission.OFFER_PAUSE,
    available: isPausable,
    title: "Pause this offer?",
    description:
      "Organizations stop seeing it and cannot enquire, and employees cannot claim it, until you resume it. Open enquiries, claims and vouchers are unaffected.",
    confirmLabel: "Pause",
    done: "Offer paused",
  },
  unpublish: {
    label: "Unpublish",
    icon: CloudOff,
    permission: BusinessOfferPermission.OFFER_WITHDRAW,
    available: isPublished,
    title: "Unpublish this offer?",
    description:
      "The live version goes offline and a draft copy is kept to edit and resubmit. Open enquiries, claims and vouchers are unaffected.",
    confirmLabel: "Unpublish",
    done: "Offer unpublished",
    destructive: true,
  },
  retire: {
    label: "Retire",
    icon: Archive,
    permission: BusinessOfferPermission.OFFER_RETIRE,
    available: isRetirable,
    title: "Retire this offer?",
    description:
      "This is final: no new enquiries, claims or edits. Enquiries, claims, vouchers and history are kept.",
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

function OwnBusinessOfferWorkspace({
  offer,
  organizationId,
}: {
  offer: Offer;
  organizationId: string;
}) {
  const canUpdate = useCanInOrganization(BusinessOfferPermission.OFFER_UPDATE);
  const canViewLeads = useCanInOrganization(BusinessOfferPermission.RECEIVED_ENQUIRY_VIEW);
  // The offer the edit started from: a background refetch must not turn a stale draft into an
  // overwrite of someone else's change (the API answers 409 instead).
  const [editingFrom, setEditingFrom] = useState<Offer | null>(null);
  const [acting, setActing] = useState<OwnOfferAction | null>(null);
  const update = useUpdateOwnBusinessOffer(organizationId, offer.id);
  const action = useOwnBusinessOfferAction(organizationId, offer.id);
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
        title={version?.title ?? "Business offer"}
        description={version?.headline}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="offer" status={offer.display_status} />
            {canViewLeads ? (
              <Button asChild variant="outline">
                <Link href={`/business/leads?offer_id=${offer.id}`}>
                  <Inbox aria-hidden />
                  Leads
                </Link>
              </Button>
            ) : null}
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
            <CardTitle>Edit business offer</CardTitle>
            <CardDescription>
              Saving replaces every field of the working draft, or starts a new one.{" "}
              {editingFrom.current_version
                ? `Organizations keep seeing version ${editingFrom.current_version.number} until Aayulogic approves the change; turning the employee switch on or off takes effect then too.`
                : "Submit it when it is ready for review."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortalBusinessOfferForm
              offer={editingFrom}
              onCancel={() => setEditingFrom(null)}
              onSubmit={async (values, intent) => {
                await update.mutateAsync({
                  ...businessOfferBody(values),
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
      <PublicationCard offer={offer} partner={offer.partner?.business_name} />
      <OwnVersions organizationId={organizationId} offerId={offer.id} />
      <OwnDecisions organizationId={organizationId} offerId={offer.id} />

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
      versions={useOwnBusinessOfferVersions(organizationId, offerId, paging)}
      paging={paging}
    />
  );
}

function OwnDecisions({ organizationId, offerId }: { organizationId: string; offerId: string }) {
  const paging = usePageParam("decisions_");
  return (
    <OfferDecisionHistory
      decisions={useOwnBusinessOfferDecisions(organizationId, offerId, paging)}
      paging={paging}
    />
  );
}
