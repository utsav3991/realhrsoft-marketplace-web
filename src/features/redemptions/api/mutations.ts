import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { claimKeys } from "@/features/claims/api/queries";
import { organizationHeader } from "@/features/offers/api/queries";
import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import { redemptionKeys, type BlockScope } from "./queries";

// Commands that change a voucher carry an Idempotency-Key (useIdempotencyKey): a retry after
// an unknown outcome replays the original result instead of failing (VOUCHER_ALREADY_USED) or
// acting twice. Every write refetches on settle, because a 409 means the voucher changed.

// QR tokens and scan references are bearer secrets: the caller keeps them in component state
// only, and gcTime 0 drops them from the mutation cache as soon as nothing observes them.
const SECRET = { gcTime: 0 } as const;

function refreshVouchers(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: redemptionKeys.all }),
    queryClient.invalidateQueries({ queryKey: claimKeys.all }),
  ]);
}

// --- Voucher owners ----------------------------------------------------------------------

/**
 * Issues a fresh QR for the voucher and replaces the previous one at once. Throttled per user,
 * so it runs only when the owner asks for it.
 */
export function useShowVoucherQr(voucherId: string) {
  return useMutation({
    ...SECRET,
    mutationFn: () =>
      unwrap(
        api.POST("/marketplace/vouchers/{voucher_id}/credential", {
          params: { path: { voucher_id: pathId(voucherId) } },
        }),
      ),
  });
}

// --- Partner counter ---------------------------------------------------------------------

/**
 * Checks a scanned QR and returns the benefit to apply with a scan reference. It neither uses
 * nor holds the voucher: only a confirmation does.
 */
export function useValidateVoucher(organizationId: string) {
  return useMutation({
    ...SECRET,
    mutationFn: (token: string) =>
      unwrap(
        api.POST("/partner/voucher-scans", {
          params: { header: organizationHeader(organizationId) },
          body: { token },
        }),
      ),
  });
}

export type ConfirmProof = { scanReference: string } | { voucherReference: string };

/** Records the use after a scan, or by the typed voucher reference, and returns the receipt. */
export function useConfirmUse(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    ...SECRET,
    mutationFn: ({
      proof,
      saleReference,
      idempotencyKey,
    }: {
      proof: ConfirmProof;
      saleReference: string;
      idempotencyKey: string;
    }) =>
      unwrap(
        api.POST("/partner/redemptions", {
          params: {
            header: { ...organizationHeader(organizationId), "Idempotency-Key": idempotencyKey },
          },
          // Exactly one proof. The generated type marks both required because they have a
          // default, but the API rejects a blank one.
          body: {
            ...("scanReference" in proof
              ? { scan_reference: proof.scanReference }
              : { voucher_reference: proof.voucherReference }),
            sale_reference: saleReference,
          } as Schemas["ConfirmInput"],
        }),
      ),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: redemptionKeys.partner(organizationId) }),
        queryClient.invalidateQueries({ queryKey: claimKeys.partner(organizationId) }),
      ]),
  });
}

/**
 * After a lost confirmation response: the receipt the attempt with this key recorded. A 404
 * means it did not commit, so the cashier scans again with a new attempt.
 */
export function useRecoverConfirmation(organizationId: string) {
  return useMutation({
    mutationFn: (idempotencyKey: string) =>
      unwrap(
        api.GET("/partner/redemptions/operations/{idempotency_key}", {
          params: {
            header: organizationHeader(organizationId),
            path: { idempotency_key: pathId(idempotencyKey) },
          },
        }),
      ),
  });
}

// --- Aayulogic administration ------------------------------------------------------------

interface ReasonCommand {
  reason: string;
  idempotencyKey: string;
}

/** Confirms the use on the partner's behalf; never bypasses expiry, prior use or a block. */
export function useAdminConfirmVoucher(voucherId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reason,
      saleReference,
      idempotencyKey,
    }: ReasonCommand & { saleReference: string }) =>
      unwrap(
        api.POST("/admin/vouchers/{voucher_id}/confirm", {
          params: {
            header: { "Idempotency-Key": idempotencyKey },
            path: { voucher_id: pathId(voucherId) },
          },
          body: { reason, sale_reference: saleReference },
        }),
      ),
    onSettled: () => refreshVouchers(queryClient),
  });
}

/** Withdraws an unused voucher for good; the claim stays accepted. */
export function useRevokeVoucher(voucherId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reason, idempotencyKey }: ReasonCommand) =>
      unwrap(
        api.POST("/admin/vouchers/{voucher_id}/revoke", {
          params: {
            header: { "Idempotency-Key": idempotencyKey },
            path: { voucher_id: pathId(voucherId) },
          },
          body: { reason },
        }),
      ),
    onSettled: () => refreshVouchers(queryClient),
  });
}

/** Corrects a confirmed use: the receipt is kept and the voucher can never be used again. */
export function useReverseReceipt(receiptId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reason, idempotencyKey }: ReasonCommand) =>
      unwrap(
        api.POST("/admin/redemptions/{redemption_id}/reverse", {
          params: {
            header: { "Idempotency-Key": idempotencyKey },
            path: { redemption_id: pathId(receiptId) },
          },
          body: { reason },
        }),
      ),
    onSettled: () => refreshVouchers(queryClient),
  });
}

/** Stops every voucher of one offer or partner from being shown, validated or confirmed. */
export function useActivateBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      scope,
      targetId,
      reason,
      idempotencyKey,
    }: ReasonCommand & { scope: BlockScope; targetId: string }) =>
      unwrap(
        api.POST("/admin/redemption-blocks", {
          params: { header: { "Idempotency-Key": idempotencyKey } },
          body: { scope, target_id: targetId, reason },
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: redemptionKeys.blocks() }),
  });
}

/** Unused, unexpired vouchers in the block's scope become usable again. */
export function useClearBlock(blockId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reason, idempotencyKey }: ReasonCommand) =>
      unwrap(
        api.POST("/admin/redemption-blocks/{block_id}/clear", {
          params: {
            header: { "Idempotency-Key": idempotencyKey },
            path: { block_id: pathId(blockId) },
          },
          body: { reason },
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: redemptionKeys.blocks() }),
  });
}
