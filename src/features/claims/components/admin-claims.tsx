"use client";

import { ArrowLeft, Check, Ticket, TicketCheck, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardAction,
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
  BenefitAdminPermission,
  ClaimAdminPermission,
  IdentityPermission,
  OfferAdminPermission,
  OrganizationAdminPermission,
  RedemptionAdminPermission,
  useCan,
} from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { PartnerFilter } from "@/features/partners/components/partner-filter";
import { OrganizationFilter } from "@/features/organizations/components/organization-filter";

import { useDecideAdminClaim } from "../api/mutations";
import {
  CLAIM_SORTS,
  useAdminClaim,
  useAdminClaims,
  type AdminClaimFilters,
  type Claim,
  type ClaimKind,
} from "../api/queries";
import {
  CLAIM_STATUSES,
  ClaimStatusCallout,
  claimStatusFrom,
  DecisionDialog,
  decisionAttempt,
  DecisionFacts,
  VoucherDetails,
  type DecisionAttempt,
} from "./claim-details";

const ALL = "all";

export const KIND_LABEL: Record<ClaimKind, string> = {
  marketplace_offer: "Offer",
  employer_benefit: "Company benefit",
  business_offer: "Business offer",
};
const KINDS = Object.keys(KIND_LABEL) as ClaimKind[];

const uuidParam = (value: string | null) => (value && isUuid(value) ? value : null);

const SOURCE_PATH: Record<ClaimKind, string> = {
  marketplace_offer: "/admin/offers",
  employer_benefit: "/admin/company-benefits",
  business_offer: "/admin/business-offers",
};

/** Where the claimed offer or benefit is administered. */
function sourceHref(claim: Pick<Claim, "kind" | "offer_id">): string {
  return `${SOURCE_PATH[claim.kind]}/${claim.offer_id}`;
}

function useCanViewSource(): Record<ClaimKind, boolean> {
  const canViewOffers = useCan(OfferAdminPermission.OFFER_VIEW);
  return {
    marketplace_offer: canViewOffers,
    employer_benefit: useCan(BenefitAdminPermission.BENEFIT_VIEW),
    business_offer: canViewOffers,
  };
}

/** Every claim of every kind; filters live in the URL. */
export function AdminClaims() {
  const { searchParams, set } = useUrlParams();
  const sort = useSortParam(CLAIM_SORTS);
  const filters: AdminClaimFilters = {
    status: claimStatusFrom(searchParams.get("status")),
    kind: KINDS.find((kind) => kind === searchParams.get("kind")) ?? null,
    offerId: uuidParam(searchParams.get("offer_id")),
    partnerId: uuidParam(searchParams.get("partner_id")),
    employerId: uuidParam(searchParams.get("employer_id")),
    ordering: sort.value,
  };
  const paging = usePageParam();
  const claims = useAdminClaims(filters, paging);
  const canViewUsers = useCan(IdentityPermission.USER_VIEW);
  const canViewSource = useCanViewSource();

  function setParam(name: string, value: string | null) {
    set({ [name]: value });
  }

  const columns: DataTableColumns<RowOf<typeof claims>> = [
    {
      id: "claim",
      header: "Claim",
      cell: (claim) => (
        <>
          <Link href={`/admin/claims/${claim.id}`} className="font-medium hover:underline">
            {claim.title}
          </Link>
          <p className="text-muted-foreground text-xs">
            {claim.partner ?? claim.employer?.name ?? ""}
          </p>
        </>
      ),
    },
    {
      id: "kind",
      header: "Kind",
      className: "hidden lg:table-cell",
      cell: (claim) => <Badge intent="outline">{KIND_LABEL[claim.kind]}</Badge>,
    },
    {
      id: "employee",
      header: "Employee",
      cell: (claim) =>
        canViewUsers ? (
          <Link href={`/admin/users/${claim.beneficiary_id}`} className="hover:underline">
            {claim.beneficiary_email}
          </Link>
        ) : (
          claim.beneficiary_email
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: (claim) => <StatusBadge domain="claim" status={claim.status} />,
    },
    {
      id: "requested",
      header: "Requested",
      sortKey: "requested_at",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (claim) => formatDate(claim.requested_at),
    },
    {
      id: "deadline",
      header: "Decide by",
      sortKey: "decision_deadline",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (claim) =>
        claim.status === "requested" && claim.decision_deadline
          ? formatDateTime(claim.decision_deadline)
          : "—",
    },
  ];
  const filtered = Object.entries(filters).some(([key, value]) => key !== "ordering" && value);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.status ?? ALL}
          onValueChange={(value) => setParam("status", value === ALL ? null : value)}
        >
          <SelectTrigger className="w-48" aria-label="Filter by status">
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
        <Select
          value={filters.kind ?? ALL}
          onValueChange={(value) => setParam("kind", value === ALL ? null : value)}
        >
          <SelectTrigger className="w-48" aria-label="Filter by kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Offers and benefits</SelectItem>
            {KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {KIND_LABEL[kind]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <PartnerFilter value={filters.partnerId} onChange={(id) => setParam("partner_id", id)} />
        <OrganizationFilter
          label="Employer"
          allLabel="All employers"
          value={filters.employerId}
          onChange={(id) => setParam("employer_id", id)}
        />
        {filters.offerId ? (
          <Badge intent="outline" className="gap-1.5 py-1.5 pr-1.5">
            {filters.kind === "employer_benefit" ? "Benefit" : "Offer"}:{" "}
            {canViewSource[filters.kind ?? "marketplace_offer"] ? (
              <Link
                href={sourceHref({
                  kind: filters.kind ?? "marketplace_offer",
                  offer_id: filters.offerId,
                })}
                className="font-mono hover:underline"
              >
                {filters.offerId.slice(0, 8)}…
              </Link>
            ) : (
              <span className="font-mono">{filters.offerId.slice(0, 8)}…</span>
            )}
            <button
              type="button"
              className="hover:bg-secondary rounded-full p-0.5"
              aria-label="Clear offer filter"
              onClick={() => setParam("offer_id", null)}
            >
              <X aria-hidden />
            </button>
          </Badge>
        ) : null}
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

/** One claim with its claimant, employer, decision and voucher or benefit use. */
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
  const canAccept = useCan(ClaimAdminPermission.CLAIM_ACCEPT);
  const canReject = useCan(ClaimAdminPermission.CLAIM_REJECT);
  const canViewUsers = useCan(IdentityPermission.USER_VIEW);
  const canViewSource = useCanViewSource()[claim.kind];
  const canViewOrganizations = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const canViewVouchers = useCan(RedemptionAdminPermission.VOUCHER_VIEW);
  const [attempt, setAttempt] = useState<DecisionAttempt | null>(null);
  const decide = useDecideAdminClaim();
  const pending = claim.status === "requested";
  const employer = claim.employer;

  return (
    <div className="space-y-6">
      <BackToClaims />
      <PageHeader
        title={claim.title}
        description={claim.partner ?? KIND_LABEL[claim.kind]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="claim" status={claim.status} />
            {pending && canReject ? (
              <Button variant="outline" onClick={() => setAttempt(decisionAttempt("reject"))}>
                <X aria-hidden />
                Reject on behalf
              </Button>
            ) : null}
            {pending && canAccept ? (
              <Button onClick={() => setAttempt(decisionAttempt("accept"))}>
                <Check aria-hidden />
                Accept on behalf
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
            <Detail label="Employee">
              {canViewUsers ? (
                <Link href={`/admin/users/${claim.beneficiary_id}`} className="hover:underline">
                  {claim.beneficiary_email}
                </Link>
              ) : (
                claim.beneficiary_email
              )}
            </Detail>
            <Detail label="Employer when claimed">
              {employer ? (
                canViewOrganizations ? (
                  <Link href={`/admin/organizations/${employer.id}`} className="hover:underline">
                    {employer.name}
                  </Link>
                ) : (
                  employer.name
                )
              ) : (
                "—"
              )}
            </Detail>
            <Detail label={KIND_LABEL[claim.kind]}>
              {canViewSource ? (
                <Link href={sourceHref(claim)} className="hover:underline">
                  {claim.title}
                </Link>
              ) : (
                claim.title
              )}
              <span className="text-muted-foreground ml-1 text-xs">
                (version {claim.version_number})
              </span>
            </Detail>
            <Detail label="Headline">{claim.headline}</Detail>
            <Detail label="Requested">{formatDateTime(claim.requested_at)}</Detail>
            {claim.decision_deadline ? (
              <Detail label="Decide by">{formatDateTime(claim.decision_deadline)}</Detail>
            ) : null}
            {claim.accepted_at ? (
              <Detail label="Accepted">{formatDateTime(claim.accepted_at)}</Detail>
            ) : null}
            <DecisionFacts claim={claim} />
          </DetailList>
        </CardContent>
      </Card>
      {claim.voucher ? (
        <Card>
          <CardHeader>
            <CardTitle>Voucher</CardTitle>
            <CardDescription>
              Issued on acceptance with the accepted version&apos;s terms.
            </CardDescription>
            {canViewVouchers ? (
              <CardAction>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/vouchers/${claim.voucher.id}`}>
                    <TicketCheck aria-hidden />
                    Open voucher
                  </Link>
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            <DetailList>
              <VoucherDetails voucher={claim.voucher} />
            </DetailList>
          </CardContent>
        </Card>
      ) : null}
      {claim.benefit_usage ? (
        <Card>
          <CardHeader>
            <CardTitle>Benefit use</CardTitle>
            <CardDescription>Claiming a company benefit records one use.</CardDescription>
          </CardHeader>
          <CardContent>
            <DetailList>
              <Detail label="Used">{formatDateTime(claim.benefit_usage.used_at)}</Detail>
              <Detail label="Use number">{claim.benefit_usage.use_number}</Detail>
            </DetailList>
          </CardContent>
        </Card>
      ) : null}

      <DecisionDialog
        attempt={attempt}
        acceptReasonRequired
        onClose={() => setAttempt(null)}
        onDecide={(input) => decide.mutateAsync({ claimId: claim.id, ...input })}
      />
    </div>
  );
}
