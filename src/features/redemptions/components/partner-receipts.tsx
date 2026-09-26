"use client";

import { ArrowLeft, ReceiptText, ScanLine } from "lucide-react";
import Link from "next/link";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Button } from "@/design-system/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { NotAPartner, useIsPartner } from "@/features/offers/components/own-offers";
import { ApiError } from "@/shared/api";
import { useSelectedOrganizationId } from "@/shared/auth";
import {
  PartnerOfferPermission,
  PartnerRedemptionPermission,
  useCanInOrganization,
} from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { ErrorState } from "@/shared/feedback/states";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatDateTime } from "@/shared/lib/format";

import { usePartnerReceipt, usePartnerReceipts, type PartnerReceipt } from "../api/queries";

import { ReceiptFilters, reversedFrom } from "./receipt-filters";
import { ReceiptFacts, ReceiptStatusBadge, SOURCE_LABEL, sourceFrom } from "./redemption-details";

/** Every confirmed use of the partner's vouchers, newest first. Customers are never named. */
export function PartnerReceipts() {
  const isPartner = useIsPartner();
  if (!isPartner) {
    return (
      <NotAPartner description="Register the business and pass Aayulogic verification; the vouchers you redeem are listed here." />
    );
  }
  return <ReceiptsList />;
}

function ReceiptsList() {
  const organizationId = useSelectedOrganizationId();
  const canRedeem = useCanInOrganization(PartnerRedemptionPermission.VOUCHER_VALIDATE);
  const { searchParams, set } = useUrlParams();
  const filters = {
    source: sourceFrom(searchParams.get("source")),
    reversed: reversedFrom(searchParams.get("reversed")),
    offerId: null,
  };
  const paging = usePageParam();
  const receipts = usePartnerReceipts(organizationId, filters, paging);

  const columns: DataTableColumns<RowOf<typeof receipts>> = [
    {
      id: "offer",
      header: "Offer",
      cell: (receipt) => (
        <Link href={`/partner/redemptions/${receipt.id}`} className="font-medium hover:underline">
          {receipt.title}
        </Link>
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
      className: "hidden md:table-cell",
      cell: (receipt) => SOURCE_LABEL[receipt.source],
    },
    {
      id: "bill",
      header: "Bill reference",
      className: "hidden lg:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (receipt) => receipt.sale_reference || "—",
    },
    {
      id: "status",
      header: "Status",
      cell: (receipt) => <ReceiptStatusBadge receipt={receipt} />,
    },
  ];
  const filtered = filters.source !== null || filters.reversed !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ReceiptFilters source={filters.source} reversed={filters.reversed} onChange={set} />
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
            title={filtered ? "No receipts match" : "No vouchers redeemed yet"}
            description={filtered ? "Try different filters." : undefined}
            action={
              !filtered && canRedeem ? (
                <Button asChild variant="outline">
                  <Link href="/partner/redeem">
                    <ScanLine aria-hidden />
                    Redeem a voucher
                  </Link>
                </Button>
              ) : null
            }
          />
        }
      />
    </div>
  );
}

function BackToReceipts() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/partner/redemptions">
        <ArrowLeft aria-hidden />
        Receipts
      </Link>
    </Button>
  );
}

/** One confirmed use; another partner's receipt is not found. */
export function PartnerReceiptRecord({ receiptId }: { receiptId: string }) {
  const organizationId = useSelectedOrganizationId();
  const receipt = usePartnerReceipt(organizationId, receiptId);

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

function LoadedReceipt({ receipt }: { receipt: PartnerReceipt }) {
  const canViewOffers = useCanInOrganization(PartnerOfferPermission.OFFER_VIEW);
  return (
    <div className="space-y-6">
      <BackToReceipts />
      <PageHeader
        title={receipt.title}
        description={receipt.partner}
        actions={<ReceiptStatusBadge receipt={receipt} />}
      />
      <Card>
        <CardHeader>
          <CardTitle>Receipt</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailList>
            <ReceiptFacts receipt={receipt} />
            <Detail label="Offer">
              {canViewOffers ? (
                <Link href={`/partner/offers/${receipt.offer_id}`} className="hover:underline">
                  {receipt.title}
                </Link>
              ) : (
                receipt.title
              )}
            </Detail>
            <Detail label="Receipt number">
              <span className="font-mono text-xs">{receipt.id}</span>
            </Detail>
          </DetailList>
        </CardContent>
      </Card>
    </div>
  );
}
