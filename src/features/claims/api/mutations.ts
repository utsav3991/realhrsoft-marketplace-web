import { useMutation, useQueryClient } from "@tanstack/react-query";

import { catalogueKeys, organizationHeader } from "@/features/offers/api/queries";
import { api, pathId, pathToken, unwrap, type Schemas } from "@/shared/api";

import { claimKeys } from "./queries";

/**
 * Claims an offer. The caller supplies the Idempotency-Key and keeps it for retries of the
 * same attempt, so a lost response replays the same claim (200) instead of failing with
 * ALREADY_CLAIMED. Refetch on failure too: a 409 means the offer or the claims changed.
 */
export function useClaimOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, idempotencyKey }: { offerId: string; idempotencyKey: string }) =>
      unwrap(
        api.POST("/marketplace/claims", {
          params: { header: { "Idempotency-Key": idempotencyKey } },
          body: { offer_id: offerId },
        }),
      ),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: claimKeys.mine() }),
        queryClient.invalidateQueries({ queryKey: catalogueKeys.all }),
      ]),
  });
}

/** Marks a claim of the selected partner organization's offer as used. */
export function useConfirmPartnerClaim(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reference, ...body }: Schemas["PartnerConfirm"] & { reference: string }) =>
      unwrap(
        api.POST("/partner/claims/{reference}/confirm", {
          params: {
            header: organizationHeader(organizationId),
            path: { reference: pathToken(reference) },
          },
          body,
        }),
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: claimKeys.partner(organizationId) }),
  });
}

/** Confirms a redemption on a partner's behalf, with an audited reason. */
export function useConfirmAdminClaim(claimId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["AdminConfirm"]) =>
      unwrap(
        api.POST("/admin/claims/{claim_id}/confirm", {
          params: { path: { claim_id: pathId(claimId) } },
          body,
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: claimKeys.admin() }),
  });
}
