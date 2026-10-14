"use client";

import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Check,
  ClipboardCheck,
  CloudOff,
  Handshake,
  Inbox,
  MessageSquareWarning,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  Ticket,
  Undo2,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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
import { useOrganization } from "@/features/organizations/api/queries";
import { OrganizationFilter } from "@/features/organizations/components/organization-filter";
import { usePartner } from "@/features/partners/api/queries";
import { PartnerFilter } from "@/features/partners/components/partner-filter";
import type { Offer } from "@/features/offers/api/queries";
import { benefitSummary } from "@/features/offers/schemas/benefit-value";
import { editableVersion } from "@/features/offers/schemas/offer";
import { useAdminCategoryOptions } from "@/features/offers/components/category-options";
import { useAdminIntents } from "@/features/offers/components/new-offer";
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
  validity,
  VisibilityBadge,
} from "@/features/offers/components/offer-details";
import { OrganizationPicker, PartnerPicker } from "@/features/offers/components/pickers";
import { OFFER_STATUSES } from "@/features/offers/components/offers-directory";
import { RedemptionControl } from "@/features/redemptions/components/redemption-blocks";
import { ApiError, isUuid } from "@/shared/api";
import {
  BusinessAdminPermission,
  ClaimAdminPermission,
  OfferAdminPermission,
  OrganizationAdminPermission,
  PartnerAdminPermission,
  useCan,
  type GlobalPermissionCode,
} from "@/shared/authorization";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { SearchField } from "@/shared/components/search-field";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatDate } from "@/shared/lib/format";

import {
  useAdminBusinessOfferAction,
  useCreateAdminBusinessOffer,
  useUpdateAdminBusinessOffer,
  type BusinessOfferAction,
} from "../api/mutations";
import {
  BUSINESS_OFFER_SORTS,
  useAdminBusinessOffer,
  useAdminBusinessOfferDecisions,
  useAdminBusinessOffers,
  useAdminBusinessOfferVersions,
} from "../api/queries";
import {
  businessOfferBody,
  businessOfferValues,
  EMPTY_BUSINESS_OFFER,
} from "../schemas/business-offer";
import { BusinessOfferForm } from "./business-offer-form";

const ALL = "all";
const uuidParam = (value: string | null) => (value && isUuid(value) ? value : null);

const EMPLOYER_ONLY =
  "Posted as an employer: only an offer posted as a verified partner can be shown to employees, because the partner confirms their vouchers.";

/** "Fitness Hub · Partner", or the organization's name and "Employer". */
function ProviderCell({ offer }: { offer: Offer }) {
  return (
    <>
      <p>{offer.partner?.business_name ?? offer.provider_organization?.name}</p>
      <p className="text-muted-foreground text-xs">{offer.partner ? "Partner" : "Employer"}</p>
    </>
  );
}

/** Every organization's business offers; the review queue is ?in_review=true. */
export function AdminBusinessOffers() {
  const { searchParams, set } = useUrlParams();
  const statusParam = searchParams.get("status");
  const status = OFFER_STATUSES.find((s) => s.value === statusParam)?.value ?? null;
  const inReview = searchParams.get("in_review") === "true" ? true : null;
  const showToEmployees = searchParams.get("show_to_employees") === "true" ? true : null;
  const partnerId = uuidParam(searchParams.get("partner_id"));
  const organizationId = uuidParam(searchParams.get("organization_id"));
  const search = searchParams.get("search") ?? "";
  const sort = useSortParam(BUSINESS_OFFER_SORTS);
  const paging = usePageParam();
  const offers = useAdminBusinessOffers(
    { search, status, inReview, showToEmployees, partnerId, organizationId, ordering: sort.value },
    paging,
  );
  const canCreate = useCan(OfferAdminPermission.OFFER_CREATE);
  const canViewEnquiries = useCan(BusinessAdminPermission.ENQUIRY_VIEW);

  const columns: DataTableColumns<RowOf<typeof offers>> = [
    {
      id: "offer",
      header: "Offer",
      cell: (offer) => {
        const version = shownVersion(offer);
        return (
          <>
            <Link
              href={`/admin/business-offers/${offer.id}`}
              className="font-medium hover:underline"
            >
              {version?.title ?? "Untitled offer"}
            </Link>
            <p className="text-muted-foreground text-xs">
              {version ? benefitSummary(version.benefit) : null}
            </p>
          </>
        );
      },
    },
    { id: "provider", header: "Provider", cell: (offer) => <ProviderCell offer={offer} /> },
    {
      id: "status",
      header: "Status",
      cell: (offer) => (
        <span className="flex flex-wrap items-center gap-1">
          <StatusBadge domain="offer" status={offer.display_status} />
          {offer.working_version?.state === "in_review" && offer.display_status !== "in_review" ? (
            <StatusBadge domain="offerVersion" status="in_review" />
          ) : null}
        </span>
      ),
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
      className: "hidden xl:table-cell",
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
  const filtered = Boolean(
    search || status || inReview || showToEmployees || partnerId || organizationId,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            placeholder="Search title or provider"
            aria-label="Search business offers by title or provider name"
            className="max-w-sm"
          />
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
          <PartnerFilter value={partnerId} onChange={(id) => set({ partner_id: id })} />
          <OrganizationFilter
            label="Audience organization"
            allLabel="Any audience organization"
            value={organizationId}
            onChange={(id) => set({ organization_id: id })}
          />
          <Button
            variant={inReview ? "secondary" : "ghost"}
            aria-pressed={inReview === true}
            onClick={() => set({ in_review: inReview ? null : "true" })}
          >
            <ClipboardCheck aria-hidden />
            Awaiting review
          </Button>
          <Button
            variant={showToEmployees ? "secondary" : "ghost"}
            aria-pressed={showToEmployees === true}
            onClick={() => set({ show_to_employees: showToEmployees ? null : "true" })}
          >
            <Users aria-hidden />
            Shown to employees
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {canViewEnquiries ? (
            <Button asChild variant="outline">
              <Link href="/admin/business-enquiries">
                <Inbox aria-hidden />
                Enquiries
              </Link>
            </Button>
          ) : null}
          {canCreate ? (
            <Button asChild>
              <Link href="/admin/business-offers/new">
                <Plus aria-hidden />
                Post business offer
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
            title={inReview ? "Nothing awaiting review" : "No business offers found"}
            description={filtered ? "Try different filters." : undefined}
          />
        }
      />
    </div>
  );
}

function BackToBusinessOffers() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/admin/business-offers">
        <ArrowLeft aria-hidden />
        Business offers
      </Link>
    </Button>
  );
}

/** The capacity an administrator posts in: a verified partner, or an employer organization. */
type Provider = { kind: "partner"; id: string } | { kind: "employer"; id: string };

/**
 * Posting on an organization's behalf: as a verified partner (?partner=) or as an employer
 * (?organization=), chosen here or linked from their records.
 */
export function NewAdminBusinessOffer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const partnerId = uuidParam(searchParams.get("partner"));
  const employerId = uuidParam(searchParams.get("organization"));
  const provider: Provider | null = partnerId
    ? { kind: "partner", id: partnerId }
    : employerId
      ? { kind: "employer", id: employerId }
      : null;
  const choose = (param: string, id: string) =>
    router.replace(`${pathname}?${param}=${encodeURIComponent(id)}`);

  return (
    <div className="space-y-6">
      <BackToBusinessOffers />
      {provider ? (
        <BusinessOfferComposer provider={provider} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="size-5" aria-hidden />
                As a verified partner
              </CardTitle>
              <CardDescription>
                The partner confirms vouchers, so only a partner offer can be shown to employees.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PartnerPicker onChoose={({ id }) => choose("partner", id)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5" aria-hidden />
                As an employer
              </CardTitle>
              <CardDescription>
                An organization whose Employer capacity is on; its offer reaches organizations
                only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationPicker selected={[]} onAdd={({ id }) => choose("organization", id)} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ProviderHeading({ provider }: { provider: Provider }) {
  const canViewPartner = useCan(PartnerAdminPermission.PARTNER_VIEW);
  const canViewOrganization = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const partner = usePartner(provider.id, {
    enabled: provider.kind === "partner" && canViewPartner,
  });
  const organization = useOrganization(provider.id, {
    enabled: provider.kind === "employer" && canViewOrganization,
  });
  if (provider.kind === "partner" && partner.isSuccess) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Handshake className="size-4" aria-hidden />
        <Link href={`/admin/partners/${provider.id}`} className="hover:underline">
          {partner.data.business_name}
        </Link>
        <StatusBadge domain="partner" status={partner.data.status} />
      </span>
    );
  }
  if (provider.kind === "employer" && organization.isSuccess) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Building2 className="size-4" aria-hidden />
        <Link href={`/admin/organizations/${provider.id}`} className="hover:underline">
          {organization.data.name}
        </Link>
        <span>· Employer</span>
      </span>
    );
  }
  return <span className="font-mono text-xs">{provider.id}</span>;
}

function BusinessOfferComposer({ provider }: { provider: Provider }) {
  const router = useRouter();
  const create = useCreateAdminBusinessOffer();
  const categories = useAdminCategoryOptions();
  const intents = useAdminIntents("Save draft");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post a business offer</CardTitle>
        <CardDescription>
          <ProviderHeading provider={provider} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        {categories.query.isPending ? (
          <Skeleton className="h-96 w-full" />
        ) : categories.query.isError ? (
          <ErrorState
            error={categories.query.error}
            onRetry={() => void categories.query.refetch()}
          />
        ) : (
          <BusinessOfferForm
            defaultValues={EMPTY_BUSINESS_OFFER}
            categories={categories.options}
            intents={intents}
            organizationPicker={(props) => <OrganizationPicker {...props} />}
            employeeSwitchBlocked={provider.kind === "partner" ? null : EMPLOYER_ONLY}
            reasonHint="Optional note, recorded in the audit log with you as the poster."
            onSubmit={async (values, intent) => {
              const offer = await create.mutateAsync({
                ...businessOfferBody(values),
                partner_id: provider.kind === "partner" ? provider.id : null,
                provider_organization_id: provider.kind === "employer" ? provider.id : null,
                intent,
              });
              toast.success(
                intent === "publish"
                  ? "Business offer published"
                  : intent === "submit"
                    ? "Business offer submitted for review"
                    : "Draft saved",
              );
              router.push(`/admin/business-offers/${offer.id}`);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

/** One business offer for Aayulogic review, publication and moderation. */
export function AdminBusinessOffer({ offerId }: { offerId: string }) {
  const offer = useAdminBusinessOffer(offerId);

  if (offer.isPending) {
    return (
      <div className="space-y-6">
        <BackToBusinessOffers />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (offer.isError) {
    return (
      <div className="space-y-6">
        <BackToBusinessOffers />
        {offer.error instanceof ApiError && offer.error.isNotFound ? (
          <EmptyState title="Business offer not found" />
        ) : (
          <ErrorState error={offer.error} onRetry={() => void offer.refetch()} />
        )}
      </div>
    );
  }
  return <BusinessOfferWorkspace offer={offer.data} />;
}

interface ActionSpec {
  label: string;
  icon: LucideIcon;
  permission: GlobalPermissionCode;
  available: (offer: Offer) => boolean;
  /** Decisions name the working version the reviewer read. */
  onVersion?: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  done: string;
  optionalReason?: boolean;
  destructive?: boolean;
}

// In priority order: the first available action is the page's primary button.
const ACTIONS: Record<BusinessOfferAction, ActionSpec> = {
  approve: {
    label: "Approve",
    icon: Check,
    permission: OfferAdminPermission.OFFER_APPROVE,
    available: isInReview,
    onVersion: true,
    title: "Approve this version?",
    description:
      "It becomes the live version at once, replacing any earlier one. Organizations in its audience see it while the provider stays in standing and it is inside its dates; with the switch on, their employees can claim it too.",
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
      "Approves the working version without a separate review, recorded as published by you, and makes it live.",
    confirmLabel: "Publish version",
    done: "Version published",
    optionalReason: true,
  },
  reinstate: {
    label: "Reinstate",
    icon: Play,
    permission: OfferAdminPermission.OFFER_REINSTATE,
    available: isSuspended,
    title: "Reinstate this business offer?",
    description:
      "Lifts the suspension. It is visible again if every other gate passes; the provider must still be in standing.",
    confirmLabel: "Reinstate offer",
    done: "Business offer reinstated",
  },
  "request-changes": {
    label: "Request changes",
    icon: MessageSquareWarning,
    permission: OfferAdminPermission.OFFER_REQUEST_CHANGES,
    available: isInReview,
    onVersion: true,
    title: "Request changes?",
    description:
      "The reason tells the owner what to change in a new draft. A live version stays live.",
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
      "The reason is shown to the owner as feedback. A live version stays live, and the owner can edit into a new draft.",
    confirmLabel: "Reject version",
    done: "Version rejected",
    destructive: true,
  },
  submit: {
    label: "Submit for review",
    icon: Send,
    permission: OfferAdminPermission.OFFER_SUBMIT,
    available: isSubmittable,
    title: "Submit for review on the owner's behalf?",
    description:
      "Freezes the draft and moves it to review. The category must be active and the end date, when set, in the future.",
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
    title: "Unpublish this business offer?",
    description:
      "Takes the live version offline (no new enquiries or claims) and keeps a draft copy to edit. Open enquiries, claims and vouchers are unaffected.",
    confirmLabel: "Unpublish",
    done: "Business offer unpublished",
    destructive: true,
  },
  suspend: {
    label: "Suspend",
    icon: Pause,
    permission: OfferAdminPermission.OFFER_SUSPEND,
    available: (offer) => offer.availability !== "retired" && !isSuspended(offer),
    title: "Suspend this business offer?",
    description:
      "Hides it from organizations and employees whatever its owner does; only reinstatement lifts it. Issued vouchers keep their terms. The owner sees your reason.",
    confirmLabel: "Suspend offer",
    done: "Business offer suspended",
    destructive: true,
  },
};

function useAvailableActions(offer: Offer): BusinessOfferAction[] {
  const granted: Record<BusinessOfferAction, boolean> = {
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
  return (Object.keys(ACTIONS) as BusinessOfferAction[]).filter(
    (action) => granted[action] && ACTIONS[action].available(offer),
  );
}

function BusinessOfferWorkspace({ offer }: { offer: Offer }) {
  const canUpdate = useCan(OfferAdminPermission.OFFER_UPDATE);
  const canViewDecisions = useCan(OfferAdminPermission.OFFER_DECISION_VIEW);
  const canViewPartner = useCan(PartnerAdminPermission.PARTNER_VIEW);
  const canViewOrganization = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const canViewClaims = useCan(ClaimAdminPermission.CLAIM_VIEW);
  const canViewEnquiries = useCan(BusinessAdminPermission.ENQUIRY_VIEW);
  const actions = useAvailableActions(offer);
  const [acting, setActing] = useState<BusinessOfferAction | null>(null);
  // The offer the edit started from: a background refetch must not turn a stale draft into an
  // overwrite of someone else's change (the API answers 409 instead).
  const [editingFrom, setEditingFrom] = useState<Offer | null>(null);
  const partner = offer.partner;
  const providerHref = partner
    ? canViewPartner && `/admin/partners/${partner.id}`
    : canViewOrganization &&
      offer.provider_organization &&
      `/admin/organizations/${offer.provider_organization.id}`;
  const providerName = partner?.business_name ?? offer.provider_organization?.name ?? "—";

  // Two buttons at most; the rest go in the menu. Only a non-destructive first is cobalt.
  const [primary, secondary, ...menu] = actions;

  return (
    <div className="space-y-6">
      <BackToBusinessOffers />
      <PageHeader
        title={shownVersion(offer)?.title ?? "Business offer"}
        description={
          <span className="flex flex-wrap items-center gap-x-2">
            {providerHref ? (
              <Link href={providerHref} className="hover:underline">
                {providerName}
              </Link>
            ) : (
              providerName
            )}
            <span aria-hidden>·</span>
            {partner ? "Partner" : "Employer"}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="offer" status={offer.display_status} />
            {canViewEnquiries ? (
              <Button asChild variant="outline">
                <Link href={`/admin/business-enquiries?offer_id=${offer.id}`}>
                  <Inbox aria-hidden />
                  Enquiries
                </Link>
              </Button>
            ) : null}
            {canViewClaims && partner ? (
              <Button asChild variant="outline">
                <Link href={`/admin/claims?kind=business_offer&offer_id=${offer.id}`}>
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
            {menu.length > 0 ? (
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
      {partner ? <RedemptionControl scope="offer" targetId={offer.id} /> : null}
      <Versions offerId={offer.id} />
      {canViewDecisions ? <Decisions offerId={offer.id} /> : null}
      <ActionDialog offer={offer} action={acting} onClose={() => setActing(null)} />
    </div>
  );
}

function ActionButton({
  action,
  primary = false,
  onClick,
}: {
  action: BusinessOfferAction;
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
  return (
    <OfferVersionHistory versions={useAdminBusinessOfferVersions(offerId, paging)} paging={paging} />
  );
}

function Decisions({ offerId }: { offerId: string }) {
  const paging = usePageParam("decisions_");
  return (
    <OfferDecisionHistory
      decisions={useAdminBusinessOfferDecisions(offerId, paging)}
      paging={paging}
    />
  );
}

function AssistedEdit({ offer, onDone }: { offer: Offer; onDone: () => void }) {
  const update = useUpdateAdminBusinessOffer(offer.id);
  const categories = useAdminCategoryOptions(editableVersion(offer)?.business_policy?.category);
  const intents = useAdminIntents("Save draft");
  const live = offer.current_version;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit business offer</CardTitle>
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
          <BusinessOfferForm
            defaultValues={businessOfferValues(offer)}
            categories={categories.options}
            intents={intents}
            organizationPicker={(props) => <OrganizationPicker {...props} />}
            employeeSwitchBlocked={offer.partner ? null : EMPLOYER_ONLY}
            reasonHint="Optional note, recorded in the audit log."
            promoCodeLocked={Boolean(offer.first_published_at)}
            onCancel={onDone}
            onSubmit={async (values, intent) => {
              await update.mutateAsync({
                ...businessOfferBody(values),
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
  action: BusinessOfferAction | null;
  onClose: () => void;
}) {
  const mutation = useAdminBusinessOfferAction(offer.id);
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
