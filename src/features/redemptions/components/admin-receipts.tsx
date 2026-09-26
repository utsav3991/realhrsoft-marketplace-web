"use client";

import { ArrowLeft, ReceiptText, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Button } from "@/design-system/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { PartnerFilter } from "@/features/partners/components/partner-filter";
import { ApiError } from "@/shared/api";
import {
  IdentityPermission,
  OfferAdminPermission,
  RedemptionAdminPermission,
  useCan,
} from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { ErrorState } from "@/shared/feedback/states";
import { useIdempotencyKey } from "@/shared/hooks/use-idempotency-key";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatDateTime } from "@/shared/lib/format";

import { useReverseReceipt } from "../api/mutations";
import { useAdminReceipt, useAdminReceipts, type AdminReceipt } from "../api/queries";

import { FilterChip, uuidParam } from "./filter-chip";
import { ReceiptFilters, reversedFrom } from "./receipt-filters";
import { ReceiptFacts, ReceiptStatusBadge, SOURCE_LABEL, sourceFrom } from "./redemption-details";

function UserLink({ id, children }: { id: string; children: ReactNode }) {
  const canViewUsers = useCan(IdentityPermission.USER_VIEW);
  return canViewUsers ? (
    <Link href={`/admin/users/${id}`} className="hover:underline">
      {children}
    </Link>
  ) : (
    <>{children}</>
  );
}

/** Every confirmed use with its owner and correction; filters live in the URL. */
export function AdminReceipts() {
  const { searchParams, set } = useUrlParams();
  const filters = {
    source: sourceFrom(searchParams.get("source")),
    reversed: reversedFrom(searchParams.get("reversed")),
    offerId: uuidParam(searchParams.get("offer_id")),
    partnerId: uuidParam(searchParams.get("partner_id")),
  };
  const paging = usePageParam();
  const receipts = useAdminReceipts(filters, paging);
  const canViewOffers = useCan(OfferAdminPermission.OFFER_VIEW);

  const columns: DataTableColumns<RowOf<typeof receipts>> = [
    {
      id: "offer",
      header: "Offer",
      cell: (receipt) => (
        <>
          <Link href={`/admin/redemptions/${receipt.id}`} className="font-medium hover:underline">
            {receipt.title}
          </Link>
          <p className="text-muted-foreground text-xs">{receipt.partner}</p>
        </>
      ),
    },
    {
      id: "employee",
      header: "Employee",
      className: "hidden md:table-cell",
      cell: (receipt) => (
        <UserLink id={receipt.beneficiary_id}>{receipt.beneficiary_email}</UserLink>
      ),
    },
    {
      id: "confirmed",
      header: "Confirmed",
      cellClassName: "text-muted-foreground",
      cell: (receipt) => formatDateTime(receipt.confirmed_at),
    },
    {
      id: "source",
      header: "How",
      className: "hidden lg:table-cell",
      cell: (receipt) => SOURCE_LABEL[receipt.source],
    },
    {
      id: "status",
      header: "Status",
      cell: (receipt) => <ReceiptStatusBadge receipt={receipt} />,
    },
  ];
  const filtered = Object.values(filters).some((value) => value !== null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ReceiptFilters source={filters.source} reversed={filters.reversed} onChange={set} />
        <PartnerFilter value={filters.partnerId} onChange={(id) => set({ partner_id: id })} />
        {filters.offerId ? (
          <FilterChip
            label="Offer"
            id={filters.offerId}
            href={canViewOffers ? `/admin/offers/${filters.offerId}` : null}
            onClear={() => set({ offer_id: null })}
          />
        ) : null}
      </div>
      <QueryDataTable
        aria-label="Receipts"
        query={receipts}
        columns={columns}
        paging={paging}
        rowKey={(receipt) => receipt.id}
        empty={
          <EmptyState
            icon={ReceiptText}
            title="No receipts found"
            description={filtered ? "Try different filters." : undefined}
          />
        }
      />
    </div>
  );
}

function BackToReceipts() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/admin/redemptions">
        <ArrowLeft aria-hidden />
        Receipts
      </Link>
    </Button>
  );
}

export function AdminReceiptRecord({ receiptId }: { receiptId: string }) {
  const receipt = useAdminReceipt(receiptId);

  if (receipt.isPending) {
    return (
      <div className="space-y-6">
        <BackToReceipts />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (receipt.isError) {
    return (
      <div className="space-y-6">
        <BackToReceipts />
        {receipt.error instanceof ApiError && receipt.error.isNotFound ? (
          <EmptyState icon={ReceiptText} title="Receipt not found" />
        ) : (
          <ErrorState error={receipt.error} onRetry={() => void receipt.refetch()} />
        )}
      </div>
    );
  }
  return <LoadedReceipt receipt={receipt.data} />;
}

function LoadedReceipt({ receipt }: { receipt: AdminReceipt }) {
  const canReverse = useCan(RedemptionAdminPermission.REDEMPTION_REVERSE);
  const canViewVouchers = useCan(RedemptionAdminPermission.VOUCHER_VIEW);
  const [reversing, setReversing] = useState(false);
  const attempt = useIdempotencyKey();
  const reverse = useReverseReceipt(receipt.id);

  return (
    <div className="space-y-6">
      <BackToReceipts />
      <PageHeader
        title={receipt.title}
        description={receipt.partner}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ReceiptStatusBadge receipt={receipt} />
            {canReverse && !receipt.reversed_at ? (
              <Button
                variant="outline"
                onClick={() => {
                  attempt.reset();
                  setReversing(true);
                }}
              >
                <Undo2 aria-hidden />
                Reverse use
              </Button>
            ) : null}
          </div>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Receipt</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <ReceiptFacts receipt={receipt} />
            <Detail label="Employee">
              <UserLink id={receipt.beneficiary_id}>{receipt.beneficiary_email}</UserLink>
            </Detail>
            <Detail label="Confirmed by user">
              <UserLink id={receipt.confirmed_by}>
                <span className="font-mono text-xs">{receipt.confirmed_by}</span>
              </UserLink>
            </Detail>
            {receipt.reason ? (
              <Detail label="Why Aayulogic confirmed it" className="sm:col-span-2 lg:col-span-3">
                <span className="whitespace-pre-line">{receipt.reason}</span>
              </Detail>
            ) : null}
            {receipt.reversed_by ? (
              <Detail label="Reversed by user">
                <UserLink id={receipt.reversed_by}>
                  <span className="font-mono text-xs">{receipt.reversed_by}</span>
                </UserLink>
              </Detail>
            ) : null}
            {canViewVouchers ? (
              <Detail label="Voucher">
                <Link href={`/admin/vouchers/${receipt.voucher_id}`} className="hover:underline">
                  Open voucher
                </Link>
              </Detail>
            ) : null}
          </DetailList>
        </CardContent>
      </Card>

      <ReasonDialog
        open={reversing}
        onOpenChange={setReversing}
        title="Reverse this use?"
        description="Records a correction, for example a use confirmed for the wrong customer. The receipt and its time are kept, the voucher can never be used again, and nothing is refunded. The employee is notified."
        confirmLabel="Reverse use"
        destructive
        onConfirm={async (reason) => {
          await attempt.run((idempotencyKey) => reverse.mutateAsync({ reason, idempotencyKey }));
          toast.success("Use reversed");
        }}
      />
    </div>
  );
}
