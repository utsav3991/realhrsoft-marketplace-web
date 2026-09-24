import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, pathId, unwrap, type Schemas } from "@/shared/api";

export type OfferStatus = "draft" | "submitted" | "changes_requested" | "approved" | "rejected";
export type OfferDecision = "approve" | "reject" | "request-changes";

export const offerKeys = {
  all: ["offers"] as const,
  // Partner reads are scoped by X-Organization-ID, so they are keyed by organization.
  partner: (organizationId: string) => [...offerKeys.all, "partner", organizationId] as const,
  partnerList: (organizationId: string, status: OfferStatus | undefined) =>
    [...offerKeys.partner(organizationId), "list", status ?? "all"] as const,
  partnerDetail: (organizationId: string, offerId: string) =>
    [...offerKeys.partner(organizationId), "detail", offerId] as const,
  review: () => [...offerKeys.all, "review"] as const,
  reviewList: (status: OfferStatus | undefined) =>
    [...offerKeys.review(), "list", status ?? "all"] as const,
  reviewDetail: (offerId: string) => [...offerKeys.review(), "detail", offerId] as const,
};

const PAGE_SIZE = 50;

// --- Partner portal ---------------------------------------------------------------------------

export function usePartnerOffers(organizationId: string, status: OfferStatus | undefined) {
  return useInfiniteQuery({
    queryKey: offerKeys.partnerList(organizationId, status),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/partner/offers", {
          params: { query: { status, cursor: pageParam ?? undefined, limit: PAGE_SIZE } },
          signal,
        }),
      ),
    getNextPageParam: (page) => page.next_cursor,
  });
}

export function usePartnerOffer(organizationId: string, offerId: string) {
  return useQuery({
    queryKey: offerKeys.partnerDetail(organizationId, offerId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/partner/offers/{offer_id}", {
          params: { path: { offer_id: pathId(offerId) } },
          signal,
        }),
      ),
  });
}

export function useCreateOffer(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["OfferBody"]) => unwrap(api.POST("/partner/offers", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: offerKeys.partner(organizationId) }),
  });
}

/** Edits and transitions refetch on failure too: a 409 means the loaded version is stale. */
function usePartnerOfferMutation<V>(
  organizationId: string,
  offerId: string,
  send: (path: { offer_id: string }, variables: V) => Promise<Schemas["VersionResponse"]>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: V) => send({ offer_id: pathId(offerId) }, variables),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: offerKeys.partner(organizationId) }),
        queryClient.invalidateQueries({ queryKey: offerKeys.review() }),
      ]),
  });
}

export function useUpdateOffer(organizationId: string, offerId: string) {
  return usePartnerOfferMutation(
    organizationId,
    offerId,
    (path, body: Schemas["UpdateOfferRequest"]) =>
      unwrap(api.PATCH("/partner/offers/{offer_id}", { params: { path }, body })),
  );
}

export function useSubmitOffer(organizationId: string, offerId: string) {
  return usePartnerOfferMutation(organizationId, offerId, (path, body: Schemas["VersionRequest"]) =>
    unwrap(api.POST("/partner/offers/{offer_id}/submit", { params: { path }, body })),
  );
}

export function useWithdrawOffer(organizationId: string, offerId: string) {
  return usePartnerOfferMutation(organizationId, offerId, (path, body: Schemas["VersionRequest"]) =>
    unwrap(api.POST("/partner/offers/{offer_id}/withdraw", { params: { path }, body })),
  );
}

// --- Moderation (global) -----------------------------------------------------------------------

export function useOffersForReview(status: OfferStatus | undefined) {
  return useInfiniteQuery({
    queryKey: offerKeys.reviewList(status),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/admin/offers", {
          params: { query: { status, cursor: pageParam ?? undefined, limit: PAGE_SIZE } },
          signal,
        }),
      ),
    getNextPageParam: (page) => page.next_cursor,
  });
}

export function useOfferForReview(offerId: string) {
  return useQuery({
    queryKey: offerKeys.reviewDetail(offerId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/offers/{offer_id}", {
          params: { path: { offer_id: pathId(offerId) } },
          signal,
        }),
      ),
  });
}

export function useDecideOffer(offerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ decision, ...body }: { decision: OfferDecision } & Schemas["DecisionRequest"]) =>
      unwrap(
        api.POST("/admin/offers/{offer_id}/{decision}", {
          params: { path: { offer_id: pathId(offerId), decision } },
          body,
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: offerKeys.all }),
  });
}
