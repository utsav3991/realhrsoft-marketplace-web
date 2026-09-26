import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { organizationHeader } from "@/features/offers/api/queries";
import { api, pathId, unwrap, type Page, type Schemas } from "@/shared/api";

export type OwnVoucher = Schemas["OwnVoucher"];
export type AdminVoucher = Schemas["Voucher"];
export type VoucherStatus = Schemas["VoucherStatusEnum"];
export type Credential = Schemas["Credential"];
export type Scan = Schemas["Scan"];
export type ScannedVoucher = Schemas["ScannedVoucher"];
export type PartnerReceipt = Schemas["PartnerRedemption"];
export type AdminReceipt = Schemas["Redemption"];
export type RedemptionSource = Schemas["RedemptionSourceEnum"];
export type RedemptionBlock = Schemas["Block"];
export type BlockScope = Schemas["RedemptionBlockScopeEnum"];

export interface VoucherFilters {
  status: VoucherStatus | null;
  offerId: string | null;
}

export interface AdminVoucherFilters extends VoucherFilters {
  partnerId: string | null;
  beneficiaryId: string | null;
}

export interface ReceiptFilters {
  source: RedemptionSource | null;
  /** true: only corrected uses; false: only uncorrected ones. */
  reversed: boolean | null;
  offerId: string | null;
}

export interface AdminReceiptFilters extends ReceiptFilters {
  partnerId: string | null;
}

export interface BlockFilters {
  active: boolean | null;
  scope: BlockScope | null;
}

export const redemptionKeys = {
  all: ["redemptions"] as const,
  // The signed-in employee's vouchers.
  mine: () => [...redemptionKeys.all, "mine"] as const,
  mineList: (filters: VoucherFilters, page: Page) =>
    [...redemptionKeys.mine(), "list", filters, page] as const,
  mineDetail: (id: string) => [...redemptionKeys.mine(), "detail", id] as const,
  // Receipts of the selected partner organization.
  partner: (organizationId: string) => [...redemptionKeys.all, "partner", organizationId] as const,
  partnerList: (organizationId: string, filters: ReceiptFilters, page: Page) =>
    [...redemptionKeys.partner(organizationId), "list", filters, page] as const,
  partnerDetail: (organizationId: string, id: string) =>
    [...redemptionKeys.partner(organizationId), "detail", id] as const,
  // Aayulogic administration.
  admin: () => [...redemptionKeys.all, "admin"] as const,
  adminVouchers: (filters: AdminVoucherFilters, page: Page) =>
    [...redemptionKeys.admin(), "vouchers", filters, page] as const,
  adminVoucher: (id: string) => [...redemptionKeys.admin(), "voucher", id] as const,
  adminReceipts: (filters: AdminReceiptFilters, page: Page) =>
    [...redemptionKeys.admin(), "receipts", filters, page] as const,
  adminReceipt: (id: string) => [...redemptionKeys.admin(), "receipt", id] as const,
  blocks: () => [...redemptionKeys.admin(), "blocks"] as const,
  blockList: (filters: BlockFilters, page: Page) =>
    [...redemptionKeys.blocks(), "list", filters, page] as const,
  blockDetail: (id: string) => [...redemptionKeys.blocks(), "detail", id] as const,
};

// --- Voucher owners (no permission code: their vouchers are theirs) ----------------------

/** The employee's vouchers, newest first; readable after employment ends. */
export function useMyVouchers(filters: VoucherFilters, page: Page) {
  return useQuery({
    queryKey: redemptionKeys.mineList(filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/marketplace/vouchers", {
          params: {
            query: {
              status: filters.status ?? undefined,
              offer_id: filters.offerId ?? undefined,
              offset: page.offset,
              limit: page.limit,
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

/**
 * One of the employee's vouchers. While its QR is on screen the caller polls it, so the owner
 * sees the partner's confirmation (status used, with the receipt) without reloading.
 */
export function useMyVoucher(voucherId: string, { enabled = true, refetchInterval = 0 } = {}) {
  return useQuery({
    queryKey: redemptionKeys.mineDetail(voucherId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/marketplace/vouchers/{voucher_id}", {
          params: { path: { voucher_id: pathId(voucherId) } },
          signal,
        }),
      ),
    enabled,
    refetchInterval: refetchInterval || false,
  });
}

// --- Partner portal (the selected organization) ------------------------------------------

function receiptQuery(filters: ReceiptFilters, page: Page) {
  return {
    source: filters.source ?? undefined,
    reversed: filters.reversed ?? undefined,
    offer_id: filters.offerId ?? undefined,
    offset: page.offset,
    limit: page.limit,
  };
}

/** Every confirmed use of the partner's vouchers, newest first, without the owner. */
export function usePartnerReceipts(organizationId: string, filters: ReceiptFilters, page: Page) {
  return useQuery({
    queryKey: redemptionKeys.partnerList(organizationId, filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/partner/redemptions", {
          params: {
            header: organizationHeader(organizationId),
            query: receiptQuery(filters, page),
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

/** Another partner's receipt is a 404. */
export function usePartnerReceipt(organizationId: string, receiptId: string) {
  return useQuery({
    queryKey: redemptionKeys.partnerDetail(organizationId, receiptId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/partner/redemptions/{redemption_id}", {
          params: {
            header: organizationHeader(organizationId),
            path: { redemption_id: pathId(receiptId) },
          },
          signal,
        }),
      ),
  });
}

// --- Aayulogic administration ------------------------------------------------------------

export function useAdminVouchers(filters: AdminVoucherFilters, page: Page) {
  return useQuery({
    queryKey: redemptionKeys.adminVouchers(filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/vouchers", {
          params: {
            query: {
              status: filters.status ?? undefined,
              offer_id: filters.offerId ?? undefined,
              partner_id: filters.partnerId ?? undefined,
              beneficiary_id: filters.beneficiaryId ?? undefined,
              offset: page.offset,
              limit: page.limit,
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminVoucher(voucherId: string) {
  return useQuery({
    queryKey: redemptionKeys.adminVoucher(voucherId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/vouchers/{voucher_id}", {
          params: { path: { voucher_id: pathId(voucherId) } },
          signal,
        }),
      ),
  });
}

export function useAdminReceipts(filters: AdminReceiptFilters, page: Page) {
  return useQuery({
    queryKey: redemptionKeys.adminReceipts(filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/redemptions", {
          params: {
            query: { ...receiptQuery(filters, page), partner_id: filters.partnerId ?? undefined },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminReceipt(receiptId: string) {
  return useQuery({
    queryKey: redemptionKeys.adminReceipt(receiptId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/redemptions/{redemption_id}", {
          params: { path: { redemption_id: pathId(receiptId) } },
          signal,
        }),
      ),
  });
}

export function useRedemptionBlocks(filters: BlockFilters, page: Page, { enabled = true } = {}) {
  return useQuery({
    queryKey: redemptionKeys.blockList(filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/redemption-blocks", {
          params: {
            query: {
              active: filters.active ?? undefined,
              scope: filters.scope ?? undefined,
              offset: page.offset,
              limit: page.limit,
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRedemptionBlock(blockId: string) {
  return useQuery({
    queryKey: redemptionKeys.blockDetail(blockId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/redemption-blocks/{block_id}", {
          params: { path: { block_id: pathId(blockId) } },
          signal,
        }),
      ),
  });
}
