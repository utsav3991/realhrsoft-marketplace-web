import { useMutation, useQueryClient } from "@tanstack/react-query";

import { catalogueKeys, organizationHeader } from "@/features/offers/api/queries";
import { api, pathId, unwrap } from "@/shared/api";

import { claimKeys } from "./queries";

// Every claim write carries an Idempotency-Key. The caller creates one per attempt and keeps
// it for retries of that attempt, so a lost response replays the original outcome instead of
// failing (ALREADY_CLAIMED, CLAIM_NOT_PENDING) or acting twice.

/**
 * Claims (auto_accept) or requests (partner_approval_required) an offer at the version the
 * employee read; OFFER_VERSION_CHANGED means other terms went live meanwhile. Refetch on
 * failure too: a 409 means the offer or the claims changed.
 */
export function useClaimOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      offerId,
      versionId,
      idempotencyKey,
    }: {
      offerId: string;
      versionId: string;
      idempotencyKey: string;
    }) =>
      unwrap(
        api.POST("/marketplace/claims", {
          params: { header: { "Idempotency-Key": idempotencyKey } },
          body: { offer_id: offerId, version_id: versionId },
        }),
      ),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: claimKeys.mine() }),
        queryClient.invalidateQueries({ queryKey: catalogueKeys.all }),
      ]),
  });
}

/** Withdraws a request still awaiting the partner. The offer cannot be requested again. */
export function useCancelClaim(claimId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idempotencyKey }: { idempotencyKey: string }) =>
      unwrap(
        api.POST("/marketplace/claims/{claim_id}/cancel", {
          params: {
            header: { "Idempotency-Key": idempotencyKey },
            path: { claim_id: pathId(claimId) },
          },
        }),
      ),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: claimKeys.mine() }),
        queryClient.invalidateQueries({ queryKey: catalogueKeys.all }),
      ]),
  });
}

export type ClaimDecision = "accept" | "reject";

interface DecideInput {
  claimId: string;
  decision: ClaimDecision;
  /** Rejections show it to the claimant; a partner's acceptance note is optional. */
  reason: string;
  idempotencyKey: string;
}

/** Accepts (issuing the voucher) or rejects a pending claim of the partner's offer. */
export function useDecidePartnerClaim(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, decision, reason, idempotencyKey }: DecideInput) => {
      const params = {
        header: {
          ...organizationHeader(organizationId),
          "Idempotency-Key": idempotencyKey,
        },
        path: { claim_id: pathId(claimId) },
      };
      return unwrap(
        decision === "accept"
          ? api.POST("/partner/offer-claims/{claim_id}/accept", { params, body: { reason } })
          : api.POST("/partner/offer-claims/{claim_id}/reject", { params, body: { reason } }),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: claimKeys.partner(organizationId) }),
  });
}

/** Decides a pending claim on the partner's behalf; the audited reason is always required. */
export function useDecideAdminClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, decision, reason, idempotencyKey }: DecideInput) => {
      const params = {
        header: { "Idempotency-Key": idempotencyKey },
        path: { claim_id: pathId(claimId) },
      };
      return unwrap(
        decision === "accept"
          ? api.POST("/admin/offer-claims/{claim_id}/accept", { params, body: { reason } })
          : api.POST("/admin/offer-claims/{claim_id}/reject", { params, body: { reason } }),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: claimKeys.admin() }),
  });
}
