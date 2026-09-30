"use client";

import {
  Archive,
  Handshake,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Target,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { DataTable, type DataTableColumns } from "@/design-system/components/data-table";
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
import { PartnerPicker } from "@/features/offers/components/pickers";
import { NotAPartner, useIsPartner } from "@/features/offers/components/own-offers";
import { usePartner } from "@/features/partners/api/queries";
import { PartnerFilter } from "@/features/partners/components/partner-filter";
import { ApiError, isUuid } from "@/shared/api";
import { PartnerAdminPermission, useCan } from "@/shared/authorization";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Detail, DetailList } from "@/shared/components/details";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { SearchField } from "@/shared/components/search-field";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatDate, formatDateTime } from "@/shared/lib/format";

import {
  useCampaignAction,
  useCreateCampaign,
  useUpdateCampaign,
  type CampaignAction,
} from "../api/mutations";
import {
  ADMIN_WORKSPACE,
  CAMPAIGN_SORTS,
  EMPTY_AD_FILTERS,
  useCampaign,
  useCampaigns,
  workspacePath,
  type Campaign,
  type CampaignStatus,
  type Flight,
  type Workspace,
} from "../api/queries";
import {
  campaignBody,
  campaignValues,
  EMPTY_CAMPAIGN,
  OBJECTIVE_LABEL,
  OBJECTIVES,
} from "../schemas/campaign";
import { BackLink, campaignHref, POSTED_VIA_LABEL, windowLabel } from "./ad-details";
import { AdsTable, NoAds } from "./ads-table";
import { AdvertisingEligibility } from "./advertising-grants";
import { CampaignForm } from "./campaign-form";
import { usePartnerWorkspace, useWorkspaceCan } from "./workspace";

const ALL = "all";
export const NOT_A_PARTNER =
  "Register the business and pass Aayulogic verification before advertising.";
const STATUSES: readonly { value: CampaignStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return allowed.find((candidate) => candidate === value) ?? null;
}

// --- Directory -------------------------------------------------------------------------

/** Campaigns with their owner, window and status; filters live in the URL. */
export function CampaignsDirectory({ workspace }: { workspace: Workspace }) {
  const { searchParams, set } = useUrlParams();
  const search = searchParams.get("search") ?? "";
  const status = oneOf(
    searchParams.get("status"),
    STATUSES.map((s) => s.value),
  );
  const objective = oneOf(
    searchParams.get("objective"),
    OBJECTIVES.map((o) => o.value),
  );
  const partnerParam = searchParams.get("partner_id");
  const partnerId = partnerParam && isUuid(partnerParam) ? partnerParam : null;
  const sort = useSortParam(CAMPAIGN_SORTS);
  const paging = usePageParam();
  const campaigns = useCampaigns(
    workspace,
    { search, status, objective, partnerId, ordering: sort.value },
    paging,
  );
  const canCreate = useWorkspaceCan(workspace, "campaignManage");
  const admin = workspace.kind === "admin";
  const base = workspacePath(workspace);

  const columns: DataTableColumns<RowOf<typeof campaigns>> = [
    {
      id: "name",
      header: "Campaign",
      sortKey: "name",
      cell: (campaign) => (
        <>
          <Link href={campaignHref(workspace, campaign.id)} className="font-medium hover:underline">
            {campaign.name}
          </Link>
          <p className="text-muted-foreground text-xs">{OBJECTIVE_LABEL[campaign.objective]}</p>
        </>
      ),
    },
    admin && {
      id: "partner",
      header: "Partner",
      cell: (campaign) => campaign.partner?.business_name ?? campaign.owner_organization.name,
    },
    {
      id: "status",
      header: "Status",
      cell: (campaign) => <StatusBadge domain="campaign" status={campaign.status} />,
    },
    {
      id: "window",
      header: "Window",
      sortKey: "starts_at",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (campaign) => windowLabel(campaign.starts_at, campaign.ends_at),
    },
    {
      id: "flights",
      header: "Flights",
      className: "hidden lg:table-cell",
      cellClassName: "text-muted-foreground tabular-nums",
      cell: (campaign) => campaign.flights.length || "—",
    },
    {
      id: "updated",
      header: "Updated",
      sortKey: "updated_at",
      className: "hidden lg:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (campaign) => formatDate(campaign.updated_at),
    },
  ];
  const filtered = Boolean(search || status || objective || partnerId);

  return (
    <div className="space-y-4">
      {workspace.kind === "partner" ? (
        <AdvertisingEligibility organizationId={workspace.organizationId} />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField placeholder="Search name" aria-label="Search campaigns" className="max-w-sm" />
          <Select
            value={status ?? ALL}
            onValueChange={(value) => set({ status: value === ALL ? null : value })}
          >
            <SelectTrigger className="w-40" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUSES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={objective ?? ALL}
            onValueChange={(value) => set({ objective: value === ALL ? null : value })}
          >
            <SelectTrigger className="w-44" aria-label="Filter by objective">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any objective</SelectItem>
              {OBJECTIVES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {admin ? (
            <PartnerFilter value={partnerId} onChange={(id) => set({ partner_id: id })} />
          ) : null}
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href={`${base}/campaigns/new`}>
              <Plus aria-hidden />
              New campaign
            </Link>
          </Button>
        ) : null}
      </div>
      <QueryDataTable
        aria-label="Campaigns"
        query={campaigns}
        columns={columns}
        sort={sort}
        paging={paging}
        rowKey={(campaign) => campaign.id}
        empty={
          <EmptyState
            icon={Target}
            title={filtered ? "No campaigns found" : "No campaigns yet"}
            description={
              filtered
                ? "Try different filters."
                : "A campaign groups advertisements under one schedule."
            }
          />
        }
      />
    </div>
  );
}

/** The partner portal's campaigns, for registered partners. */
export function OwnCampaigns() {
  const workspace = usePartnerWorkspace();
  const isPartner = useIsPartner();
  if (!isPartner) return <NotAPartner description={NOT_A_PARTNER} />;
  return <CampaignsDirectory workspace={workspace} />;
}

// --- Create ----------------------------------------------------------------------------

function CampaignComposer({
  workspace,
  partnerId,
  heading,
}: {
  workspace: Workspace;
  partnerId?: string;
  heading: ReactNode;
}) {
  const router = useRouter();
  const create = useCreateCampaign(workspace);
  return (
    <Card>
      <CardHeader>
        <CardTitle>New campaign</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">{heading}</CardDescription>
      </CardHeader>
      <CardContent>
        <CampaignForm
          defaultValues={EMPTY_CAMPAIGN}
          submitLabel="Create campaign"
          reasonHint={
            workspace.kind === "admin"
              ? "Optional note, recorded in the audit log with you as the creator."
              : "Optional note, recorded in the audit log."
          }
          onSubmit={async (values) => {
            const campaign = await create.mutateAsync({
              ...campaignBody(values),
              partner_id: partnerId,
            });
            toast.success("Campaign created");
            router.push(campaignHref(workspace, campaign.id));
          }}
        />
      </CardContent>
    </Card>
  );
}

/** Creating a campaign for a verified partner; the partner comes from ?partner= or is chosen. */
export function AdminNewCampaign() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const partner = searchParams.get("partner");
  const partnerId = partner && isUuid(partner) ? partner : null;
  return (
    <div className="space-y-6">
      <BackLink href="/admin/campaigns" label="Campaigns" />
      {partnerId ? (
        <CampaignComposer
          workspace={ADMIN_WORKSPACE}
          partnerId={partnerId}
          heading={
            <>
              <Handshake className="size-4" aria-hidden />
              <PartnerName partnerId={partnerId} />
            </>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Which partner is this campaign for?</CardTitle>
            <CardDescription>Campaigns can be created only for verified partners.</CardDescription>
          </CardHeader>
          <CardContent>
            <PartnerPicker
              onChoose={({ id }) => router.replace(`${pathname}?partner=${encodeURIComponent(id)}`)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PartnerName({ partnerId }: { partnerId: string }) {
  const canView = useCan(PartnerAdminPermission.PARTNER_VIEW);
  const partner = usePartner(partnerId, { enabled: canView });
  if (!canView || !partner.isSuccess) return <span className="font-mono text-xs">{partnerId}</span>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Link href={`/admin/partners/${partnerId}`} className="hover:underline">
        {partner.data.business_name}
      </Link>
      <StatusBadge domain="partner" status={partner.data.status} />
    </span>
  );
}

export function NewOwnCampaign() {
  const workspace = usePartnerWorkspace();
  const isPartner = useIsPartner();
  if (!isPartner) return <NotAPartner description={NOT_A_PARTNER} />;
  return (
    <div className="space-y-6">
      <BackLink href="/partner/campaigns" label="Campaigns" />
      <CampaignComposer
        workspace={workspace}
        heading="Create advertisements in it once it exists. Nothing is shown to employees until an advertisement is approved."
      />
    </div>
  );
}

// --- Record ----------------------------------------------------------------------------

export function CampaignRecord({
  workspace,
  campaignId,
}: {
  workspace: Workspace;
  campaignId: string;
}) {
  const campaign = useCampaign(workspace, campaignId);
  const back = <BackLink href={`${workspacePath(workspace)}/campaigns`} label="Campaigns" />;
  if (campaign.isPending) {
    return (
      <div className="space-y-6">
        {back}
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (campaign.isError) {
    return (
      <div className="space-y-6">
        {back}
        {campaign.error instanceof ApiError && campaign.error.isNotFound ? (
          <EmptyState title="Campaign not found" />
        ) : (
          <ErrorState error={campaign.error} onRetry={() => void campaign.refetch()} />
        )}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {back}
      <CampaignWorkspace workspace={workspace} campaign={campaign.data} />
    </div>
  );
}

export function OwnCampaign({ campaignId }: { campaignId: string }) {
  const workspace = usePartnerWorkspace();
  const isPartner = useIsPartner();
  if (!isPartner) return <NotAPartner description={NOT_A_PARTNER} />;
  return <CampaignRecord workspace={workspace} campaignId={campaignId} />;
}

interface StatusActionSpec {
  label: string;
  icon: LucideIcon;
  available: (campaign: Campaign) => boolean;
  title: string;
  description: string;
  done: string;
  destructive?: boolean;
}

const STATUS_ACTIONS: Record<CampaignAction, StatusActionSpec> = {
  pause: {
    label: "Pause",
    icon: Pause,
    available: (campaign) => campaign.status === "active",
    title: "Pause this campaign?",
    description:
      "Every advertisement in it stops serving until you resume it. Their review state and any Aayulogic suspension are unchanged.",
    done: "Campaign paused",
  },
  resume: {
    label: "Resume",
    icon: Play,
    available: (campaign) => campaign.status === "paused",
    title: "Resume this campaign?",
    description:
      "Its approved advertisements may serve again inside its window. Resuming never lifts an advertisement's own pause or a suspension.",
    done: "Campaign resumed",
  },
  archive: {
    label: "Archive",
    icon: Archive,
    available: (campaign) => campaign.status !== "archived",
    title: "Archive this campaign?",
    description:
      "This is final: the campaign and every advertisement in it are archived and never served again. A revision under review is retracted.",
    done: "Campaign archived",
    destructive: true,
  },
};

function CampaignWorkspace({ workspace, campaign }: { workspace: Workspace; campaign: Campaign }) {
  const canManage = useWorkspaceCan(workspace, "campaignManage");
  const canViewAds = useWorkspaceCan(workspace, "adView");
  const canCreateAd = useWorkspaceCan(workspace, "adManage");
  // The campaign the edit started from: a background refetch must not turn a stale edit into
  // an overwrite of someone else's change (the API answers 409 instead).
  const [editingFrom, setEditingFrom] = useState<Campaign | null>(null);
  const [acting, setActing] = useState<CampaignAction | null>(null);
  const update = useUpdateCampaign(workspace, campaign.id);
  // Only the portal offers these actions, so administrators never send one.
  const campaignAction = useCampaignAction(
    workspace.kind === "partner" ? workspace.organizationId : "",
    campaign.id,
  );
  const archived = campaign.status === "archived";
  // Pause, resume and archive are owner controls: the portal has them, administrators do not.
  const actions =
    workspace.kind === "partner" && canManage
      ? (Object.keys(STATUS_ACTIONS) as CampaignAction[]).filter((action) =>
          STATUS_ACTIONS[action].available(campaign),
        )
      : [];
  const base = workspacePath(workspace);

  return (
    <>
      <PageHeader
        title={campaign.name}
        description={
          workspace.kind === "admin"
            ? (campaign.partner?.business_name ?? campaign.owner_organization.name)
            : OBJECTIVE_LABEL[campaign.objective]
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="campaign" status={campaign.status} />
            {canCreateAd && !archived ? (
              <Button asChild>
                <Link href={`${base}/advertisements/new?campaign=${campaign.id}`}>
                  <Plus aria-hidden />
                  New advertisement
                </Link>
              </Button>
            ) : null}
            {actions.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {actions.map((action) => {
                    const Icon = STATUS_ACTIONS[action].icon;
                    return (
                      <DropdownMenuItem key={action} onSelect={() => setActing(action)}>
                        <Icon aria-hidden />
                        {STATUS_ACTIONS[action].label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        }
      />

      {editingFrom ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit campaign</CardTitle>
            <CardDescription>
              Saving replaces the definition and every flight. The status is unchanged.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CampaignForm
              defaultValues={campaignValues(editingFrom)}
              submitLabel="Save campaign"
              reasonHint="Optional note, recorded in the audit log."
              onCancel={() => setEditingFrom(null)}
              onSubmit={async (values) => {
                await update.mutateAsync({
                  ...campaignBody(values),
                  expected_version: editingFrom.version,
                });
                toast.success("Campaign saved");
                setEditingFrom(null);
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <CampaignDetails
          campaign={campaign}
          editAction={
            canManage && !archived ? (
              <Button variant="outline" size="sm" onClick={() => setEditingFrom(campaign)}>
                <Pencil aria-hidden />
                Edit
              </Button>
            ) : null
          }
        />
      )}

      {canViewAds ? (
        <Card>
          <CardHeader>
            <CardTitle>Advertisements</CardTitle>
            <CardDescription>Every advertisement filed under this campaign.</CardDescription>
          </CardHeader>
          <CardContent>
            <AdsTable
              workspace={workspace}
              filters={{ ...EMPTY_AD_FILTERS, campaignId: campaign.id }}
              prefix="ads_"
              showCampaign={false}
              sortable={false}
              empty={<NoAds title="No advertisements in this campaign" />}
            />
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={acting !== null}
        onOpenChange={(open) => !open && setActing(null)}
        title={STATUS_ACTIONS[acting ?? "pause"].title}
        description={STATUS_ACTIONS[acting ?? "pause"].description}
        confirmLabel={STATUS_ACTIONS[acting ?? "pause"].label}
        destructive={STATUS_ACTIONS[acting ?? "pause"].destructive}
        onConfirm={async () => {
          if (!acting || workspace.kind !== "partner") return;
          await campaignAction.mutateAsync({
            action: acting,
            expected_version: campaign.version,
            reason: "",
          });
          toast.success(STATUS_ACTIONS[acting].done);
        }}
      />
    </>
  );
}

const FLIGHT_COLUMNS: DataTableColumns<Flight> = [
  { id: "name", header: "Flight", cell: (flight) => flight.name || "—" },
  {
    id: "starts",
    header: "Starts",
    cellClassName: "text-muted-foreground",
    cell: (flight) => formatDateTime(flight.starts_at),
  },
  {
    id: "ends",
    header: "Ends",
    cellClassName: "text-muted-foreground",
    cell: (flight) => (flight.ends_at ? formatDateTime(flight.ends_at) : "With the campaign"),
  },
];

function CampaignDetails({
  campaign,
  editAction,
}: {
  campaign: Campaign;
  editAction: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Campaign</CardTitle>
          <CardDescription>Objective, schedule and flights.</CardDescription>
        </div>
        {editAction}
      </CardHeader>
      <CardContent className="space-y-6">
        <DetailList>
          <Detail label="Objective">{OBJECTIVE_LABEL[campaign.objective]}</Detail>
          <Detail label="Window">{windowLabel(campaign.starts_at, campaign.ends_at)}</Detail>
          <Detail label="Owner">{campaign.owner_organization.name}</Detail>
          <Detail label="Posted via">{POSTED_VIA_LABEL[campaign.posted_via]}</Detail>
          {campaign.archived_at ? (
            <Detail label="Archived">{formatDateTime(campaign.archived_at)}</Detail>
          ) : null}
          <Detail label="Description" className="sm:col-span-2 lg:col-span-3">
            <span className="whitespace-pre-line">{campaign.description || "—"}</span>
          </Detail>
        </DetailList>
        <DataTable
          aria-label="Flights"
          columns={FLIGHT_COLUMNS}
          rows={campaign.flights}
          rowKey={(flight) => flight.id}
          className="rounded-lg"
          empty={
            <p className="text-muted-foreground rounded-lg border p-4 text-sm">
              No flights: placements run across the whole campaign window.
            </p>
          }
        />
      </CardContent>
    </Card>
  );
}


// --- Administrator entry points ---------------------------------------------------------

export function AdminCampaigns() {
  return <CampaignsDirectory workspace={ADMIN_WORKSPACE} />;
}

export function AdminCampaign({ campaignId }: { campaignId: string }) {
  return <CampaignRecord workspace={ADMIN_WORKSPACE} campaignId={campaignId} />;
}
