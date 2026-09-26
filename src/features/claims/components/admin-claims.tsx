"use client";

import { ArrowLeft, BadgeCheck, Ticket, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { RichText } from "@/design-system/components/rich-text-editor";
import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError, isUuid } from "@/shared/api";
import {
  ClaimAdminPermission,
  IdentityPermission,
  OfferAdminPermission,
  OrganizationAdminPermission,
  useCan,
} from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { PartnerFilter } from "@/features/partners/components/partner-filter";
import { OrganizationFilter } from "@/features/organizations/components/organization-filter";

import { useConfirmAdminClaim } from "../api/mutations";
import {
  ADMIN_CLAIM_SORTS,
  useAdminClaim,
  useAdminClaims,
  type AdminClaimFilters,
  type Claim,
} from "../api/queries";
import {
  CLAIM_STATUSES,
  ClaimStatusCallout,
  claimStatusFrom,
  RedemptionDetails,
  ReferenceCode,
} from "./claim-details";

const ALL = "all";

/**
 * Identifier filters other admin pages link with (?offer_id=…), shown as removable chips.
 * Partner and employer have their own pickers.
 */
const ID_FILTERS = [
  { param: "offer_id", key: "offerId", label: "Offer" },
  { param: "employee_id", key: "employeeId", label: "Employee" },
] as const;

const uuidParam = (value: string | null) => (value && isUuid(value) ? value : null);

/** Every employee's claims; filters live in the URL. */
export function AdminClaims() {
  const { searchParams, set } = useUrlParams();
  const sort = useSortParam(ADMIN_CLAIM_SORTS);
  const filters: AdminClaimFilters = {
    status: claimStatusFrom(searchParams.get("status")),
    offerId: uuidParam(searchParams.get("offer_id")),
    partnerId: uuidParam(searchParams.get("partner_id")),
    organizationId: uuidParam(searchParams.get("organization_id")),
    employeeId: uuidParam(searchParams.get("employee_id")),
    ordering: sort.value,
  };
  const paging = usePageParam();
  const claims = useAdminClaims(filters, paging);
  const canViewUsers = useCan(IdentityPermission.USER_VIEW);
  const canViewOffers = useCan(OfferAdminPermission.OFFER_VIEW);

  function setParam(name: string, value: string | null) {
    set({ [name]: value });
  }

  const columns: DataTableColumns<RowOf<typeof claims>> = [
    {
      id: "reference",
      header: "Reference",
      sortKey: "reference",
      cell: (claim) => (
        <Link href={`/admin/claims/${claim.id}`} className="font-mono font-medium hover:underline">
          {claim.reference}
        </Link>
      ),
    },
    {
      id: "offer",
      header: "Offer",
      sortKey: "title",
      cell: (claim) => (
        <>
          {canViewOffers ? (
            <Link href={`/admin/offers/${claim.offer_id}`} className="hover:underline">
              {claim.title}
            </Link>
          ) : (
            claim.title
          )}
          <p className="text-muted-foreground text-xs">{claim.partner_name}</p>
        </>
      ),
    },
    {
      id: "employee",
      header: "Employee",
      sortKey: "employee_email",
      cell: (claim) =>
        canViewUsers ? (
          <Link href={`/admin/users/${claim.employee_id}`} className="hover:underline">
            {claim.employee_email}
          </Link>
        ) : (
          claim.employee_email
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: (claim) => <StatusBadge domain="claim" status={claim.status} />,
    },
    {
      id: "claimed",
      header: "Claimed",
      sortKey: "claimed_at",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (claim) => formatDate(claim.claimed_at),
    },
    {
      id: "use-by",
      header: "Use by",
      sortKey: "expires_at",
      cellClassName: "text-muted-foreground",
      cell: (claim) => formatDate(claim.expires_at),
    },
  ];
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.status ?? ALL}
          onValueChange={(value) => setParam("status", value === ALL ? null : value)}
        >
          <SelectTrigger className="w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {CLAIM_STATUSES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <PartnerFilter value={filters.partnerId} onChange={(id) => setParam("partner_id", id)} />
        <OrganizationFilter
          label="Employer"
          allLabel="All employers"
          value={filters.organizationId}
          onChange={(id) => setParam("organization_id", id)}
        />
        {ID_FILTERS.map(({ param, key, label }) =>
          filters[key] ? (
            <Badge key={param} intent="outline" className="gap-1.5 py-1.5 pr-1.5">
              {label}: <span className="font-mono">{filters[key]?.slice(0, 8)}…</span>
              <button
                type="button"
                className="hover:bg-secondary rounded-full p-0.5"
                aria-label={`Clear ${label.toLowerCase()} filter`}
                onClick={() => setParam(param, null)}
              >
                <X aria-hidden />
              </button>
            </Badge>
          ) : null,
        )}
      </div>

      <QueryDataTable
        aria-label="Claims"
        query={claims}
        columns={columns}
        sort={sort}
        paging={paging}
        rowKey={(claim) => claim.id}
        empty={
          <EmptyState
            icon={Ticket}
            title="No claims found"
            description={filtered ? "Try different filters." : undefined}
          />
        }
      />
    </div>
  );
}

function BackToClaims() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/admin/claims">
        <ArrowLeft aria-hidden />
        Claims
      </Link>
    </Button>
  );
}

/** One claim with its employee, employer, redemption snapshot and confirmation. */
export function AdminClaim({ claimId }: { claimId: string }) {
  const claim = useAdminClaim(claimId);

  if (claim.isPending) {
    return (
      <div className="space-y-6">
        <BackToClaims />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (claim.isError) {
    return (
      <div className="space-y-6">
        <BackToClaims />
        {claim.error instanceof ApiError && claim.error.isNotFound ? (
          <EmptyState icon={Ticket} title="Claim not found" />
        ) : (
          <ErrorState error={claim.error} onRetry={() => void claim.refetch()} />
        )}
      </div>
    );
  }
  return <LoadedClaim claim={claim.data} />;
}

function LoadedClaim({ claim }: { claim: Claim }) {
  const canConfirm = useCan(ClaimAdminPermission.CLAIM_CONFIRM);
  const canViewUsers = useCan(IdentityPermission.USER_VIEW);
  const canViewOffers = useCan(OfferAdminPermission.OFFER_VIEW);
  const canViewOrganizations = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const [confirming, setConfirming] = useState(false);
  const confirm = useConfirmAdminClaim(claim.id);

  return (
    <div className="space-y-6">
      <BackToClaims />
      <PageHeader
        title={claim.title}
        description={claim.partner_name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="claim" status={claim.status} />
            {canConfirm && claim.status === "active" ? (
              <Button onClick={() => setConfirming(true)}>
                <BadgeCheck aria-hidden />
                Confirm on behalf
              </Button>
            ) : null}
          </div>
        }
      />
      <ClaimStatusCallout claim={claim} audience="admin" />
      <Card>
        <CardHeader>
          <CardTitle>Claim</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <Detail label="Reference">
              <ReferenceCode reference={claim.reference} />
            </Detail>
            <Detail label="Employee">
              {canViewUsers ? (
                <Link href={`/admin/users/${claim.employee_id}`} className="hover:underline">
                  {claim.employee_email}
                </Link>
              ) : (
                claim.employee_email
              )}
            </Detail>
            <Detail label="Employer when claimed">
              {canViewOrganizations ? (
                <Link
                  href={`/admin/organizations/${claim.organization_id}`}
                  className="font-mono text-xs hover:underline"
                >
                  {claim.organization_id}
                </Link>
              ) : (
                <span className="font-mono text-xs">{claim.organization_id}</span>
              )}
            </Detail>
            <Detail label="Offer">
              {canViewOffers ? (
                <Link href={`/admin/offers/${claim.offer_id}`} className="hover:underline">
                  {claim.title}
                </Link>
              ) : (
                claim.title
              )}
              <span className="text-muted-foreground ml-1 text-xs">
                (revision {claim.offer_revision})
              </span>
            </Detail>
            <Detail label="Benefit">{claim.benefit}</Detail>
            <Detail label="Claimed">{formatDateTime(claim.claimed_at)}</Detail>
            <Detail label="Use by">{formatDateTime(claim.expires_at)}</Detail>
            <Detail label="Terms and conditions" className="sm:col-span-2 lg:col-span-3">
              <RichText value={claim.terms} />
            </Detail>
          </DetailList>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Redemption details</CardTitle>
          <CardDescription>
            Issued to the employee when they claimed; later offer edits do not change them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailList>
            <RedemptionDetails claim={claim} />
          </DetailList>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Confirmation</CardTitle>
        </CardHeader>
        <CardContent>
          {claim.redemption ? (
            <DetailList>
              <Detail label="Confirmed">{formatDateTime(claim.redemption.confirmed_at)}</Detail>
              <Detail label="Via">
                {claim.redemption.via === "admin" ? "Aayulogic on behalf" : "Partner portal"}
              </Detail>
              <Detail label="Confirmed by">
                <span className="font-mono text-xs">{claim.redemption.confirmed_by}</span>
              </Detail>
              <Detail label="Note" className="sm:col-span-2 lg:col-span-3">
                <span className="whitespace-pre-line">{claim.redemption.reason || "—"}</span>
              </Detail>
            </DetailList>
          ) : (
            <p className="text-muted-foreground text-sm">Not confirmed.</p>
          )}
        </CardContent>
      </Card>

      <ReasonDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Confirm this redemption on the partner's behalf?"
        description={`Claim ${claim.reference} is marked used and cannot be redeemed again. Use this for support cases, such as a partner without portal users.`}
        confirmLabel="Confirm redemption"
        onConfirm={async (reason) => {
          await confirm.mutateAsync({ reason });
          toast.success(`Claim ${claim.reference} redeemed`);
        }}
      />
    </div>
  );
}
