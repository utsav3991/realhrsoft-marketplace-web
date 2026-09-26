import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SortOrdering } from "@/design-system/components/data-table";
import { organizationHeader } from "@/features/offers/api/queries";
import { api, pathId, unwrap, type Page, type Schemas } from "@/shared/api";

export type Claim = Schemas["Claim"];
export type OwnClaim = Schemas["OwnClaim"];
export type PartnerClaim = Schemas["PartnerClaim"];
export type ClaimStatus = Schemas["ClaimStatusEnum"];
export type ClaimKind = Schemas["OfferKindEnum"];
export type Voucher = Schemas["VoucherSummary"];

/** Claim columns the API sorts by (`ordering`). */
export const CLAIM_SORTS = ["requested_at", "decision_deadline", "accepted_at"] as const;
export type ClaimOrdering = SortOrdering<(typeof CLAIM_SORTS)[number]>;

export interface AdminClaimFilters {
  status: ClaimStatus | null;
  kind: ClaimKind | null;
  offerId: string | null;
  partnerId: string | null;
  /** The claimant's employer when they claimed. */
  employerId: string | null;
  ordering: ClaimOrdering | null;
}

export const claimKeys = {
  all: ["claims"] as const,
  // The signed-in employee's own marketplace claims (My offers).
  mine: () => [...claimKeys.all, "mine"] as const,
  mineList: (
    status: ClaimStatus | null,
    offerId: string | null,
    ordering: ClaimOrdering | null,
    page: Page,
  ) => [...claimKeys.mine(), "list", status, offerId, ordering, page] as const,
  mineDetail: (id: string) => [...claimKeys.mine(), "detail", id] as const,
  // Claims of the selected partner organization's offers.
  partner: (organizationId: string) => [...claimKeys.all, "partner", organizationId] as const,
  partnerList: (
    organizationId: string,
    status: ClaimStatus | null,
    ordering: ClaimOrdering | null,
    page: Page,
  ) => [...claimKeys.partner(organizationId), "list", status, ordering, page] as const,
  partnerDetail: (organizationId: string, id: string) =>
    [...claimKeys.partner(organizationId), "detail", id] as const,
  // Aayulogic administration.
  admin: () => [...claimKeys.all, "admin"] as const,
  adminList: (filters: AdminClaimFilters, page: Page) =>
    [...claimKeys.admin(), "list", filters, page] as const,
  adminDetail: (id: string) => [...claimKeys.admin(), "detail", id] as const,
};

// --- Employee (eligibility, no permission code) ------------------------------------------

/** The employee's marketplace claims, newest first by default. History outlives employment. */
export function useMyClaims(
  status: ClaimStatus | null,
  offerId: string | null,
  ordering: ClaimOrdering | null,
  page: Page,
) {
  return useQuery({
    queryKey: claimKeys.mineList(status, offerId, ordering, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/marketplace/claims", {
          params: {
            query: {
              status: status ?? undefined,
              offer_id: offerId ?? undefined,
              ordering: ordering ? [ordering] : undefined,
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

export function useMyClaim(claimId: string) {
  return useQuery({
    queryKey: claimKeys.mineDetail(claimId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/marketplace/claims/{claim_id}", {
          params: { path: { claim_id: pathId(claimId) } },
          signal,
        }),
      ),
  });
}

// --- Partner portal (the selected organization) ------------------------------------------

/** The partner's claims; the decision queue is status=requested. Claimants are never named. */
export function usePartnerClaims(
  organizationId: string,
  status: ClaimStatus | null,
  ordering: ClaimOrdering | null,
  page: Page,
) {
  return useQuery({
    queryKey: claimKeys.partnerList(organizationId, status, ordering, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/partner/offer-claims", {
          params: {
            header: organizationHeader(organizationId),
            query: {
              status: status ?? undefined,
              ordering: ordering ? [ordering] : undefined,
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

/** Another organization's claim is a 404. */
export function usePartnerClaim(organizationId: string, claimId: string) {
  return useQuery({
    queryKey: claimKeys.partnerDetail(organizationId, claimId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/partner/offer-claims/{claim_id}", {
          params: {
            header: organizationHeader(organizationId),
            path: { claim_id: pathId(claimId) },
          },
          signal,
        }),
      ),
  });
}

// --- Aayulogic administration ------------------------------------------------------------

/** Every claim of both kinds, with its claimant, employer at claim time and decision. */
export function useAdminClaims(filters: AdminClaimFilters, page: Page) {
  return useQuery({
    queryKey: claimKeys.adminList(filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/offer-claims", {
          params: {
            query: {
              status: filters.status ?? undefined,
              kind: filters.kind ?? undefined,
              offer_id: filters.offerId ?? undefined,
              partner_id: filters.partnerId ?? undefined,
              employer_id: filters.employerId ?? undefined,
              ordering: filters.ordering ? [filters.ordering] : undefined,
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

export function useAdminClaim(claimId: string) {
  return useQuery({
    queryKey: claimKeys.adminDetail(claimId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/offer-claims/{claim_id}", {
          params: { path: { claim_id: pathId(claimId) } },
          signal,
        }),
      ),
  });
}
