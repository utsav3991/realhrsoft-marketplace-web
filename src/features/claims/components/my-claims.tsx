"use client";

import { ArrowLeft, Ban, Store, Ticket } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
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
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError } from "@/shared/api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Detail, DetailList } from "@/shared/components/details";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";

import { VoucherQr } from "@/features/redemptions/components/voucher-qr";

import { useCancelClaim } from "../api/mutations";
import { CLAIM_SORTS, useMyClaim, useMyClaims, type OwnClaim } from "../api/queries";
import {
  CLAIM_STATUSES,
  ClaimStatusCallout,
  claimStatusFrom,
  DecisionFacts,
  MarketplaceErrorState,
  VoucherDetails,
} from "./claim-details";

/** My offers: every request and claim with its decision; the status tab lives in the URL. */
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
      cell: (claim) => (
        <>
          <Link href={`/marketplace/claims/${claim.id}`} className="font-medium hover:underline">
            {claim.title}
          </Link>
          <p className="text-muted-foreground text-xs">{claim.partner}</p>
        </>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (claim) => <StatusBadge domain="claim" status={claim.status} />,
    },
    {
      id: "voucher",
      header: "Voucher",
      className: "hidden sm:table-cell",
      cell: (claim) =>
        claim.voucher ? (
          <StatusBadge domain="voucher" status={claim.voucher.status} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
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
      id: "use-by",
      header: "Use by",
      cellClassName: "text-muted-foreground",
      cell: (claim) => (claim.voucher ? formatDate(claim.voucher.valid_until) : "—"),
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

/** One claim: its decision and, once accepted, the voucher to show the business. */
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

/**
 * A request can be withdrawn while it awaits the partner. The API refuses one past its
 * deadline (CLAIM_DEADLINE_PASSED), which the dialog shows.
 */
const isCancellable = (claim: OwnClaim) => claim.status === "requested";

function LoadedClaim({ claim }: { claim: OwnClaim }) {
  const voucher = claim.voucher;
  const usable = voucher?.status === "available";
  return (
    <div className="space-y-6">
      <BackToMyClaims />
      <PageHeader
        title={claim.title}
        description={claim.partner}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="claim" status={claim.status} />
            {isCancellable(claim) ? <CancelAction claim={claim} /> : null}
          </div>
        }
      />
      <ClaimStatusCallout claim={claim} audience="employee" />
      {voucher ? (
        <Card>
          <CardHeader>
            <CardTitle>Your voucher</CardTitle>
            <CardDescription>
              {usable
                ? "Show the QR code at the business. The voucher is used only when they confirm it; showing a code or opening a link does not."
                : "The voucher issued when your claim was accepted."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {usable ? <VoucherQr voucherId={voucher.id} reference={voucher.reference} /> : null}
            <DetailList>
              <VoucherDetails voucher={voucher} usable={usable} />
            </DetailList>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>What you requested</CardTitle>
          <CardDescription>
            The offer&apos;s terms at version {claim.version_number}; later changes by the business
            do not affect your claim.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailList>
            <Detail label="Offer">{claim.headline}</Detail>
            <Detail label="Requested">{formatDateTime(claim.requested_at)}</Detail>
            {claim.decision_deadline && claim.status === "requested" ? (
              <Detail label="Decision due">{formatDateTime(claim.decision_deadline)}</Detail>
            ) : null}
            {claim.accepted_at ? (
              <Detail label="Accepted">{formatDateTime(claim.accepted_at)}</Detail>
            ) : null}
            <DecisionFacts claim={claim} />
          </DetailList>
        </CardContent>
      </Card>
    </div>
  );
}

function CancelAction({ claim }: { claim: OwnClaim }) {
  const cancel = useCancelClaim(claim.id);
  const [open, setOpen] = useState(false);
  // One key per cancel attempt, reused if the same attempt is retried.
  const idempotencyKey = useRef<string | null>(null);
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          idempotencyKey.current = crypto.randomUUID();
          setOpen(true);
        }}
      >
        <Ban aria-hidden />
        Cancel request
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Cancel this request?"
        description="The business will not decide on it, and you cannot request this offer again."
        confirmLabel="Cancel request"
        destructive
        onConfirm={async () => {
          const key = idempotencyKey.current ?? crypto.randomUUID();
          idempotencyKey.current = key;
          await cancel.mutateAsync({ idempotencyKey: key });
          toast.success("Request cancelled");
        }}
      />
    </>
  );
}
