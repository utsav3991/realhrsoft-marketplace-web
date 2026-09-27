"use client";

import { Store, TicketCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import { MarketplaceErrorState } from "@/features/claims/components/claim-details";
import { isUuid } from "@/shared/api";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { StatusBadge } from "@/shared/components/status-badge";
import { LoadingState } from "@/shared/feedback/states";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatDate, formatDateTime } from "@/shared/lib/format";

import { useMyVoucher, useMyVouchers } from "../api/queries";

import { BenefitText, VOUCHER_STATUSES, voucherStatusFrom } from "./redemption-details";

/** Every voucher the employee holds; each opens its claim, where the QR is shown. */
export function MyVouchers() {
  const { searchParams, set } = useUrlParams();
  const status = voucherStatusFrom(searchParams.get("status"));
  const paging = usePageParam();
  const vouchers = useMyVouchers({ status, offerId: null }, paging);

  const columns: DataTableColumns<RowOf<typeof vouchers>> = [
    {
      id: "offer",
      header: "Offer",
      cell: (voucher) => (
        <>
          <Link
            href={`/marketplace/claims/${voucher.claim_id}`}
            className="font-medium hover:underline"
          >
            {voucher.title}
          </Link>
          <p className="text-muted-foreground text-xs">{voucher.partner}</p>
        </>
      ),
    },
    {
      id: "benefit",
      header: "Benefit",
      className: "hidden md:table-cell",
      cell: (voucher) => <BenefitText benefit={voucher.benefit} />,
    },
    {
      id: "status",
      header: "Status",
      cell: (voucher) => <StatusBadge domain="voucher" status={voucher.status} />,
    },
    {
      id: "when",
      header: "Use by / used",
      cellClassName: "text-muted-foreground",
      cell: (voucher) =>
        voucher.used_at ? formatDateTime(voucher.used_at) : formatDate(voucher.valid_until),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {[{ value: null, label: "All" }, ...VOUCHER_STATUSES].map((option) => (
          <Button
            key={option.label}
            size="sm"
            variant={status === option.value ? "secondary" : "ghost"}
            aria-pressed={status === option.value}
            onClick={() => set({ status: option.value })}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <QueryDataTable
        aria-label="My vouchers"
        query={vouchers}
        columns={columns}
        paging={paging}
        rowKey={(voucher) => voucher.id}
        errorState={(error, retry) => (
          <MarketplaceErrorState history error={error} onRetry={retry} />
        )}
        empty={
          <EmptyState
            icon={TicketCheck}
            title={status ? "No vouchers with this status" : "You have no vouchers yet"}
            description={
              status ? undefined : "Claiming an offer gives you a voucher once it is accepted."
            }
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

/**
 * A link to one voucher (from a notification) opens its claim, where the voucher and its QR
 * live. The API answers only for the signed-in owner's vouchers; anyone else gets its error.
 */
export function OpenVoucher({ voucherId }: { voucherId: string }) {
  const router = useRouter();
  const voucher = useMyVoucher(voucherId);
  const claimId = voucher.data?.claim_id;

  useEffect(() => {
    if (claimId && isUuid(claimId)) router.replace(`/marketplace/claims/${claimId}`);
  }, [claimId, router]);

  if (voucher.isError) {
    return (
      <MarketplaceErrorState history error={voucher.error} onRetry={() => void voucher.refetch()} />
    );
  }
  return <LoadingState label="Opening your voucher…" />;
}
