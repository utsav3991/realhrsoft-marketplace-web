"use client";

import { ArrowLeft, Store, Ticket } from "lucide-react";
import Link from "next/link";

import { RichText } from "@/design-system/components/rich-text-editor";
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
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError } from "@/shared/api";
import { Detail, DetailList } from "@/shared/components/details";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";

import { CLAIM_SORTS, useMyClaim, useMyClaims, type EmployeeClaim } from "../api/queries";
import {
  CLAIM_STATUSES,
  ClaimStatusCallout,
  claimStatusFrom,
  MarketplaceErrorState,
  RedemptionDetails,
  ReferenceCode,
} from "./claim-details";

/** My offers: every claim with its status; the status tab lives in the URL. */
export function MyClaims() {
  const { searchParams, set } = useUrlParams();
  const status = claimStatusFrom(searchParams.get("status"));
  const sort = useSortParam(CLAIM_SORTS);
  const paging = usePageParam();
  const claims = useMyClaims(status, null, sort.value, paging);

  function setStatus(value: string | null) {
    set({ status: value });
  }

  const columns: DataTableColumns<RowOf<typeof claims>> = [
    {
      id: "offer",
      header: "Offer",
      sortKey: "title",
      cell: (claim) => (
        <>
          <Link href={`/marketplace/claims/${claim.id}`} className="font-medium hover:underline">
            {claim.title}
          </Link>
          <p className="text-muted-foreground text-xs">{claim.partner_name}</p>
        </>
      ),
    },
    {
      id: "reference",
      header: "Reference",
      sortKey: "reference",
      cellClassName: "font-mono",
      cell: (claim) => claim.reference,
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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {[{ value: null, label: "All" }, ...CLAIM_STATUSES].map((option) => (
          <Button
            key={option.label}
            size="sm"
            variant={status === option.value ? "secondary" : "ghost"}
            aria-pressed={status === option.value}
            onClick={() => setStatus(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <QueryDataTable
        aria-label="My claims"
        query={claims}
        columns={columns}
        sort={sort}
        paging={paging}
        rowKey={(claim) => claim.id}
        errorState={(error, retry) => (
          <MarketplaceErrorState history error={error} onRetry={retry} />
        )}
        empty={
          <EmptyState
            icon={Ticket}
            title={status ? "No claims with this status" : "You haven't claimed any offers yet"}
            action={
              status ? null : (
                <Button asChild variant="outline">
                  <Link href="/marketplace">
                    <Store aria-hidden />
                    Discover offers
                  </Link>
                </Button>
              )
            }
          />
        }
      />
    </div>
  );
}

function BackToMyClaims() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/marketplace/claims">
        <ArrowLeft aria-hidden />
        My offers
      </Link>
    </Button>
  );
}

/** One claim: the reference to show the partner and the redemption details issued with it. */
export function MyClaim({ claimId }: { claimId: string }) {
  const claim = useMyClaim(claimId);

  if (claim.isPending) {
    return (
      <div className="space-y-6">
        <BackToMyClaims />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (claim.isError) {
    return (
      <div className="space-y-6">
        <BackToMyClaims />
        {claim.error instanceof ApiError && claim.error.isNotFound ? (
          <EmptyState icon={Ticket} title="Claim not found" />
        ) : (
          <MarketplaceErrorState history error={claim.error} onRetry={() => void claim.refetch()} />
        )}
      </div>
    );
  }
  return <LoadedClaim claim={claim.data} />;
}

function LoadedClaim({ claim }: { claim: EmployeeClaim }) {
  const active = claim.status === "active";
  return (
    <div className="space-y-6">
      <BackToMyClaims />
      <PageHeader
        title={claim.title}
        description={claim.partner_name}
        actions={<StatusBadge domain="claim" status={claim.status} />}
      />
      <ClaimStatusCallout claim={claim} audience="employee" />
      <Card>
        <CardHeader>
          <CardTitle>Redeem</CardTitle>
          <CardDescription>
            {active
              ? "Show this reference to the business. They confirm the redemption with it."
              : "The details issued when you claimed the offer."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailList>
            <Detail label="Reference">
              <ReferenceCode reference={claim.reference} copyable={active} />
            </Detail>
            <RedemptionDetails claim={claim} copyable={active} scannable={active} />
          </DetailList>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>What you claimed</CardTitle>
          <CardDescription>
            The offer as it was when you claimed it; later changes by the business do not affect
            your claim.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailList>
            <Detail label="Benefit">{claim.benefit}</Detail>
            <Detail label="Claimed">{formatDateTime(claim.claimed_at)}</Detail>
            <Detail label="Use by">{formatDateTime(claim.expires_at)}</Detail>
            {claim.used_at ? (
              <Detail label="Redeemed">{formatDateTime(claim.used_at)}</Detail>
            ) : null}
            <Detail label="Terms and conditions" className="sm:col-span-2 lg:col-span-3">
              <RichText value={claim.terms} />
            </Detail>
          </DetailList>
        </CardContent>
      </Card>
    </div>
  );
}
