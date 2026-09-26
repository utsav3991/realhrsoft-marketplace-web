import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SortOrdering } from "@/design-system/components/data-table";
import { organizationHeader } from "@/features/offers/api/queries";
import { api, pathId, pathToken, unwrap, type Page, type Schemas } from "@/shared/api";

export type Claim = Schemas["Claim"];
export type EmployeeClaim = Schemas["EmployeeClaim"];
export type PartnerClaim = Schemas["PartnerClaim"];
export type ClaimStatus = Schemas["ClaimStatusEnum"];

/** Claim columns the API sorts by (`ordering`); administrators also sort by employee. */
export const CLAIM_SORTS = ["reference", "title", "claimed_at", "expires_at", "used_at"] as const;
export type ClaimOrdering = SortOrdering<(typeof CLAIM_SORTS)[number]>;
export const ADMIN_CLAIM_SORTS = [...CLAIM_SORTS, "employee_email"] as const;
export type AdminClaimOrdering = SortOrdering<(typeof ADMIN_CLAIM_SORTS)[number]>;

export interface AdminClaimFilters {
  status: ClaimStatus | null;
  offerId: string | null;
  partnerId: string | null;
  organizationId: string | null;
  employeeId: string | null;
  ordering: AdminClaimOrdering | null;
}

export const claimKeys = {
  all: ["claims"] as const,
  // The signed-in employee's own claims (My offers).
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
  partnerDetail: (organizationId: string, reference: string) =>
    [...claimKeys.partner(organizationId), "detail", reference] as const,
  // Aayulogic administration.
  admin: () => [...claimKeys.all, "admin"] as const,
  adminList: (filters: AdminClaimFilters, page: Page) =>
    [...claimKeys.admin(), "list", filters, page] as const,
  adminDetail: (id: string) => [...claimKeys.admin(), "detail", id] as const,
};

/** Claim references are 10 characters; the API matches them ignoring case. */
export const REFERENCE_PATTERN = /^[A-Za-z0-9]{10}$/;

export function normalizeReference(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

// --- Employee (eligibility, no permission code) ------------------------------------------

/** The employee's claims, newest first by default. Former employees keep reading their history. */
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
        api.GET("/partner/claims", {
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

/** Looks up the reference an employee shows; another partner's claim is a 404. */
export function usePartnerClaim(organizationId: string, reference: string | null) {
  return useQuery({
    queryKey: claimKeys.partnerDetail(organizationId, reference ?? ""),
    enabled: reference !== null,
    retry: false,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/partner/claims/{reference}", {
          params: {
            header: organizationHeader(organizationId),
            path: { reference: pathToken(reference ?? "") },
          },
          signal,
        }),
      ),
  });
}

// --- Aayulogic administration ------------------------------------------------------------

export function useAdminClaims(filters: AdminClaimFilters, page: Page) {
  return useQuery({
    queryKey: claimKeys.adminList(filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/claims", {
          params: {
            query: {
              status: filters.status ?? undefined,
              offer_id: filters.offerId ?? undefined,
              partner_id: filters.partnerId ?? undefined,
              organization_id: filters.organizationId ?? undefined,
              employee_id: filters.employeeId ?? undefined,
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
        api.GET("/admin/claims/{claim_id}", {
          params: { path: { claim_id: pathId(claimId) } },
          signal,
        }),
      ),
  });
}
