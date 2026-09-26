import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import type { SortOrdering } from "@/design-system/components/data-table";
import { organizationHeader, type DisplayStatus } from "@/features/offers/api/queries";
import { api, nextOffset, PAGE_SIZE, pathId, unwrap, type Page, type Schemas } from "@/shared/api";

// A company benefit is an offer of kind employer_benefit: versioned terms, direct publication
// and claim-as-use. Its routes keep the benefit vocabulary.
export type Benefit = Schemas["CompanyBenefit"];
export type EmployeeBenefit = Schemas["CompanyBenefitCard"];
export type BenefitClaim = Schemas["OwnClaimListItem"];

/** Benefit columns the API sorts by (`ordering`). */
export const BENEFIT_SORTS = ["first_published_at", "updated_at", "created_at"] as const;
export type BenefitOrdering = SortOrdering<(typeof BENEFIT_SORTS)[number]>;
export const BENEFIT_CLAIM_SORTS = ["accepted_at"] as const;
export type BenefitClaimOrdering = SortOrdering<(typeof BENEFIT_CLAIM_SORTS)[number]>;

export interface BenefitFilters {
  search: string;
  status: DisplayStatus | null;
  ordering: BenefitOrdering | null;
}

export interface AdminBenefitFilters extends BenefitFilters {
  organizationId: string | null;
}

export const benefitKeys = {
  all: ["company-benefits"] as const,
  // The selected employer organization's own benefits (portal).
  own: (organizationId: string) => [...benefitKeys.all, "own", organizationId] as const,
  ownList: (organizationId: string, filters: BenefitFilters, page: Page) =>
    [...benefitKeys.own(organizationId), "list", filters, page] as const,
  ownDetail: (organizationId: string, id: string) =>
    [...benefitKeys.own(organizationId), "detail", id] as const,
  ownVersions: (organizationId: string, id: string, page: Page) =>
    [...benefitKeys.own(organizationId), "versions", id, page] as const,
  // Aayulogic moderation.
  admin: () => [...benefitKeys.all, "admin"] as const,
  adminList: (filters: AdminBenefitFilters, page: Page) =>
    [...benefitKeys.admin(), "list", filters, page] as const,
  adminDetail: (id: string) => [...benefitKeys.admin(), "detail", id] as const,
  adminDecisions: (id: string, page: Page) =>
    [...benefitKeys.admin(), "decisions", id, page] as const,
  adminVersions: (id: string, page: Page) => [...benefitKeys.admin(), "versions", id, page] as const,
  // The signed-in employee's employer's benefits and their own uses.
  mine: () => [...benefitKeys.all, "mine"] as const,
  mineList: () => [...benefitKeys.mine(), "list"] as const,
  mineDetail: (id: string) => [...benefitKeys.mine(), "detail", id] as const,
  mineClaims: (benefitId: string | null) => [...benefitKeys.mine(), "claims", benefitId] as const,
  mineClaimPage: (benefitId: string | null, ordering: BenefitClaimOrdering | null, page: Page) =>
    [...benefitKeys.mineClaims(benefitId), ordering, page] as const,
};

// --- Employer portal (the selected organization) -----------------------------------------

export function useOwnBenefits(organizationId: string, filters: BenefitFilters, page: Page) {
  return useQuery({
    queryKey: benefitKeys.ownList(organizationId, filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/employer/benefits", {
          params: {
            header: organizationHeader(organizationId),
            query: {
              search: filters.search || undefined,
              display_status: filters.status ?? undefined,
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

export function useOwnBenefit(organizationId: string, benefitId: string) {
  return useQuery({
    queryKey: benefitKeys.ownDetail(organizationId, benefitId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/employer/benefits/{offer_id}", {
          params: {
            header: organizationHeader(organizationId),
            path: { offer_id: pathId(benefitId) },
          },
          signal,
        }),
      ),
  });
}

export function useOwnBenefitVersions(organizationId: string, benefitId: string, page: Page) {
  return useQuery({
    queryKey: benefitKeys.ownVersions(organizationId, benefitId, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/employer/benefits/{offer_id}/versions", {
          params: {
            header: organizationHeader(organizationId),
            path: { offer_id: pathId(benefitId) },
            query: { offset: page.offset, limit: page.limit },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

// --- Aayulogic moderation ----------------------------------------------------------------

export function useAdminBenefits(filters: AdminBenefitFilters, page: Page) {
  return useQuery({
    queryKey: benefitKeys.adminList(filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/company-benefits", {
          params: {
            query: {
              search: filters.search || undefined,
              display_status: filters.status ?? undefined,
              organization_id: filters.organizationId ?? undefined,
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

export function useAdminBenefit(benefitId: string) {
  return useQuery({
    queryKey: benefitKeys.adminDetail(benefitId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/company-benefits/{offer_id}", {
          params: { path: { offer_id: pathId(benefitId) } },
          signal,
        }),
      ),
  });
}

/** Publications, suspensions and reinstatements, newest first. */
export function useAdminBenefitDecisions(benefitId: string, page: Page) {
  return useQuery({
    queryKey: benefitKeys.adminDecisions(benefitId, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/company-benefits/{offer_id}/decisions", {
          params: {
            path: { offer_id: pathId(benefitId) },
            query: { offset: page.offset, limit: page.limit },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminBenefitVersions(benefitId: string, page: Page) {
  return useQuery({
    queryKey: benefitKeys.adminVersions(benefitId, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/company-benefits/{offer_id}/versions", {
          params: {
            path: { offer_id: pathId(benefitId) },
            query: { offset: page.offset, limit: page.limit },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

// --- Employee (eligibility, no permission code) ------------------------------------------

/** Live benefits of the employee's current employer. */
export function useMyBenefits() {
  return useInfiniteQuery({
    queryKey: benefitKeys.mineList(),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/marketplace/company-benefits", {
          params: { query: { offset: pageParam, limit: PAGE_SIZE } },
          signal,
        }),
      ),
    getNextPageParam: nextOffset,
  });
}

export function useMyBenefit(benefitId: string) {
  return useQuery({
    queryKey: benefitKeys.mineDetail(benefitId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/marketplace/company-benefits/{offer_id}", {
          params: { path: { offer_id: pathId(benefitId) } },
          signal,
        }),
      ),
  });
}

/** The employee's benefit uses, newest first unless sorted. Former employees keep reading them. */
export function useMyBenefitClaims(
  benefitId: string | null,
  ordering: BenefitClaimOrdering | null,
  page: Page,
) {
  return useQuery({
    queryKey: benefitKeys.mineClaimPage(benefitId, ordering, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/marketplace/benefit-claims", {
          params: {
            query: {
              offer_id: benefitId ?? undefined,
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
