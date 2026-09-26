"use client";

import { ArrowLeft, Ban, CheckCircle2, TicketCheck } from "lucide-react";
import Link from "next/link";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { PartnerFilter } from "@/features/partners/components/partner-filter";
import { ApiError } from "@/shared/api";
import {
  ClaimAdminPermission,
  IdentityPermission,
  OfferAdminPermission,
  RedemptionAdminPermission,
  useCan,
} from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { FieldsDialog, type DialogField } from "@/shared/components/fields-dialog";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { useIdempotencyKey } from "@/shared/hooks/use-idempotency-key";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatDate, formatDateTime } from "@/shared/lib/format";

import { useAdminConfirmVoucher, useRevokeVoucher } from "../api/mutations";
import { useAdminVoucher, useAdminVouchers, type AdminVoucher } from "../api/queries";

import { FilterChip, uuidParam } from "./filter-chip";
import {
  BenefitText,
  PresentationFacts,
  SOURCE_LABEL,
  VOUCHER_STATUSES,
  voucherStatusFrom,
} from "./redemption-details";

const ALL = "all";

/** Every voucher with its owner; filters live in the URL. */
export function AdminVouchers() {
  const { searchParams, set } = useUrlParams();
  const filters = {
    status: voucherStatusFrom(searchParams.get("status")),
    offerId: uuidParam(searchParams.get("offer_id")),
    partnerId: uuidParam(searchParams.get("partner_id")),
    beneficiaryId: uuidParam(searchParams.get("beneficiary_id")),
  };
  const paging = usePageParam();
  const vouchers = useAdminVouchers(filters, paging);
  const canViewUsers = useCan(IdentityPermission.USER_VIEW);
  const canViewOffers = useCan(OfferAdminPermission.OFFER_VIEW);

  const columns: DataTableColumns<RowOf<typeof vouchers>> = [
    {
      id: "offer",
      header: "Offer",
      cell: (voucher) => (
        <>
          <Link href={`/admin/vouchers/${voucher.id}`} className="font-medium hover:underline">
            {voucher.title}
          </Link>
          <p className="text-muted-foreground text-xs">{voucher.partner}</p>
        </>
      ),
    },
    {
      id: "employee",
      header: "Employee",
      className: "hidden md:table-cell",
      cell: (voucher) =>
        canViewUsers ? (
          <Link href={`/admin/users/${voucher.beneficiary_id}`} className="hover:underline">
            {voucher.beneficiary_email}
          </Link>
        ) : (
          voucher.beneficiary_email
        ),
    },
    {
      id: "reference",
      header: "Reference",
      className: "hidden lg:table-cell",
      cell: (voucher) => <span className="font-mono">{voucher.reference}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (voucher) => <StatusBadge domain="voucher" status={voucher.status} />,
    },
    {
      id: "when",
      header: "Use by / used",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (voucher) =>
        voucher.used_at ? formatDateTime(voucher.used_at) : formatDate(voucher.valid_until),
    },
  ];
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.status ?? ALL}
          onValueChange={(value) => set({ status: value === ALL ? null : value })}
        >
          <SelectTrigger className="w-48" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {VOUCHER_STATUSES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <PartnerFilter value={filters.partnerId} onChange={(id) => set({ partner_id: id })} />
        {filters.offerId ? (
          <FilterChip
            label="Offer"
            id={filters.offerId}
            href={canViewOffers ? `/admin/offers/${filters.offerId}` : null}
            onClear={() => set({ offer_id: null })}
          />
        ) : null}
        {filters.beneficiaryId ? (
          <FilterChip
            label="Employee"
            id={filters.beneficiaryId}
            href={canViewUsers ? `/admin/users/${filters.beneficiaryId}` : null}
            onClear={() => set({ beneficiary_id: null })}
          />
        ) : null}
      </div>

      <QueryDataTable
        aria-label="Vouchers"
        query={vouchers}
        columns={columns}
        paging={paging}
        rowKey={(voucher) => voucher.id}
        empty={
          <EmptyState
            icon={TicketCheck}
            title="No vouchers found"
            description={filtered ? "Try different filters." : undefined}
          />
        }
      />
    </div>
  );
}

function BackToVouchers() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/admin/vouchers">
        <ArrowLeft aria-hidden />
        Vouchers
      </Link>
    </Button>
  );
}

export function AdminVoucherRecord({ voucherId }: { voucherId: string }) {
  const voucher = useAdminVoucher(voucherId);

  if (voucher.isPending) {
    return (
      <div className="space-y-6">
        <BackToVouchers />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (voucher.isError) {
    return (
      <div className="space-y-6">
        <BackToVouchers />
        {voucher.error instanceof ApiError && voucher.error.isNotFound ? (
          <EmptyState icon={TicketCheck} title="Voucher not found" />
        ) : (
          <ErrorState error={voucher.error} onRetry={() => void voucher.refetch()} />
        )}
      </div>
    );
  }
  return <LoadedVoucher voucher={voucher.data} />;
}

const CONFIRM_FIELDS: readonly DialogField[] = [
  {
    name: "sale_reference",
    label: "Bill reference",
    hint: "The partner's bill or POS number, if known.",
    optional: true,
    maxLength: 100,
  },
];

/** Never used, so it can be revoked; an expired one too. */
const isRevocable = (voucher: AdminVoucher) =>
  voucher.status !== "used" && voucher.status !== "reversed" && voucher.status !== "revoked";

function LoadedVoucher({ voucher }: { voucher: AdminVoucher }) {
  const canConfirm = useCan(RedemptionAdminPermission.VOUCHER_CONFIRM);
  const canRevoke = useCan(RedemptionAdminPermission.VOUCHER_REVOKE);
  const canViewReceipts = useCan(RedemptionAdminPermission.REDEMPTION_VIEW);
  const canViewClaims = useCan(ClaimAdminPermission.CLAIM_VIEW);
  const canViewOffers = useCan(OfferAdminPermission.OFFER_VIEW);
  const canViewUsers = useCan(IdentityPermission.USER_VIEW);
  const [acting, setActing] = useState<"confirm" | "revoke" | null>(null);
  const attempt = useIdempotencyKey();
  const confirm = useAdminConfirmVoucher(voucher.id);
  const revoke = useRevokeVoucher(voucher.id);
  const receipt = voucher.redemption;

  function open(action: "confirm" | "revoke") {
    attempt.reset();
    setActing(action);
  }

  return (
    <div className="space-y-6">
      <BackToVouchers />
      <PageHeader
        title={voucher.title}
        description={voucher.partner}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="voucher" status={voucher.status} />
            {canRevoke && isRevocable(voucher) ? (
              <Button variant="outline" onClick={() => open("revoke")}>
                <Ban aria-hidden />
                Revoke
              </Button>
            ) : null}
            {canConfirm && voucher.status === "available" ? (
              <Button onClick={() => open("confirm")}>
                <CheckCircle2 aria-hidden />
                Confirm use on behalf
              </Button>
            ) : null}
          </div>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Voucher</CardTitle>
          <CardDescription>
            Issued when the claim was accepted, with that version&apos;s terms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DetailList>
            <Detail label="Employee">
              {canViewUsers ? (
                <Link href={`/admin/users/${voucher.beneficiary_id}`} className="hover:underline">
                  {voucher.beneficiary_email}
                </Link>
              ) : (
                voucher.beneficiary_email
              )}
            </Detail>
            <Detail label="Reference">
              <span className="font-mono text-base font-bold tracking-[0.2em]">
                {voucher.reference}
              </span>
            </Detail>
            <Detail label="Usable">
              {formatDateTime(voucher.valid_from)} – {formatDateTime(voucher.valid_until)}
            </Detail>
            <Detail label="Benefit">
              <BenefitText benefit={voucher.benefit} />
            </Detail>
            <PresentationFacts presentation={voucher.presentation} />
            <Detail label="Offer">
              {canViewOffers ? (
                <Link href={`/admin/offers/${voucher.offer_id}`} className="hover:underline">
                  {voucher.headline}
                </Link>
              ) : (
                voucher.headline
              )}
            </Detail>
            {canViewClaims ? (
              <Detail label="Claim">
                <Link href={`/admin/claims/${voucher.claim_id}`} className="hover:underline">
                  Open claim
                </Link>
              </Detail>
            ) : null}
            {voucher.revoked_at ? (
              <Detail label="Revoked">{formatDateTime(voucher.revoked_at)}</Detail>
            ) : null}
            {voucher.revocation_reason ? (
              <Detail label="Why it was revoked" className="sm:col-span-2 lg:col-span-3">
                <span className="whitespace-pre-line">{voucher.revocation_reason}</span>
              </Detail>
            ) : null}
          </DetailList>
        </CardContent>
      </Card>
      {receipt ? (
        <Card>
          <CardHeader>
            <CardTitle>Use</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList>
              <Detail label="Confirmed">{formatDateTime(receipt.confirmed_at)}</Detail>
              <Detail label="Confirmed by">{SOURCE_LABEL[receipt.source]}</Detail>
              {receipt.reversed_at ? (
                <Detail label="Reversed">{formatDateTime(receipt.reversed_at)}</Detail>
              ) : null}
              {canViewReceipts ? (
                <Detail label="Receipt">
                  <Link href={`/admin/redemptions/${receipt.id}`} className="hover:underline">
                    Open receipt
                  </Link>
                </Detail>
              ) : null}
            </DetailList>
          </CardContent>
        </Card>
      ) : null}

      <FieldsDialog
        open={acting === "confirm"}
        onOpenChange={(next) => !next && setActing(null)}
        title="Confirm this voucher's use?"
        description="Records the use for the partner, for example when their portal is unavailable. The voucher is used at once and cannot be used again. Use it only when the partner applied the benefit."
        confirmLabel="Confirm use"
        fields={CONFIRM_FIELDS}
        onConfirm={async (values) => {
          await attempt.run((idempotencyKey) =>
            confirm.mutateAsync({
              reason: values.reason,
              saleReference: values.sale_reference ?? "",
              idempotencyKey,
            }),
          );
          toast.success("Use confirmed");
        }}
      />
      <ReasonDialog
        open={acting === "revoke"}
        onOpenChange={(next) => !next && setActing(null)}
        title="Revoke this voucher?"
        description="Its QR code stops working and it can never be used. The claim stays accepted, so the employee cannot claim this offer again. They are notified."
        confirmLabel="Revoke voucher"
        destructive
        onConfirm={async (reason) => {
          await attempt.run((idempotencyKey) => revoke.mutateAsync({ reason, idempotencyKey }));
          toast.success("Voucher revoked");
        }}
      />
    </div>
  );
}
