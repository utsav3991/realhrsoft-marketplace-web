import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import type { SortOrdering } from "@/design-system/components/data-table";
import { organizationHeader } from "@/features/offers/api/queries";
import { api, nextOffset, PAGE_SIZE, pathId, unwrap, type Page, type Schemas } from "@/shared/api";

export type Benefit = Schemas["CompanyBenefit"];
export type BenefitDisplayStatus = Schemas["BenefitDisplayStatusEnum"];
export type EmployeeBenefit = Schemas["EmployeeCompanyBenefit"];
export type BenefitClaim = Schemas["BenefitClaim"];

/** Benefit columns the API sorts by (`ordering`); administrators also sort by employer. */
export const BENEFIT_SORTS = ["title", "valid_from", "claim_count"] as const;
export const ADMIN_BENEFIT_SORTS = [...BENEFIT_SORTS, "organization_name"] as const;
export type AdminBenefitOrdering = SortOrdering<(typeof ADMIN_BENEFIT_SORTS)[number]>;
export const BENEFIT_CLAIM_SORTS = ["claimed_at", "title"] as const;
export type BenefitClaimOrdering = SortOrdering<(typeof BENEFIT_CLAIM_SORTS)[number]>;

export interface BenefitFilters {
  search: string;
  status: BenefitDisplayStatus | null;
  ordering: SortOrdering<(typeof BENEFIT_SORTS)[number]> | null;
}

export interface AdminBenefitFilters extends Omit<BenefitFilters, "ordering"> {
  organizationId: string | null;
  ordering: AdminBenefitOrdering | null;
}

export const benefitKeys = {
  all: ["company-benefits"] as const,
  // The selected employer organization's own benefits (portal).
  own: (organizationId: string) => [...benefitKeys.all, "own", organizationId] as const,
  ownList: (organizationId: string, filters: BenefitFilters, page: Page) =>
    [...benefitKeys.own(organizationId), "list", filters, page] as const,
  ownDetail: (organizationId: string, id: string) =>
    [...benefitKeys.own(organizationId), "detail", id] as const,
  // Aayulogic moderation.
  admin: () => [...benefitKeys.all, "admin"] as const,
  adminList: (filters: AdminBenefitFilters, page: Page) =>
    [...benefitKeys.admin(), "list", filters, page] as const,
  adminDetail: (id: string) => [...benefitKeys.admin(), "detail", id] as const,
  // The signed-in employee's employer's benefits and their own claims.
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
              status: filters.status ?? undefined,
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
        api.GET("/employer/benefits/{benefit_id}", {
          params: {
            header: organizationHeader(organizationId),
            path: { benefit_id: pathId(benefitId) },
          },
          signal,
        }),
      ),
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
              status: filters.status ?? undefined,
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
        api.GET("/admin/company-benefits/{benefit_id}", {
          params: { path: { benefit_id: pathId(benefitId) } },
          signal,
        }),
      ),
  });
}

// --- Employee (eligibility, no permission code) ------------------------------------------

/** Benefits the employee's current employer offers now; newest published first. */
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
        api.GET("/marketplace/company-benefits/{benefit_id}", {
          params: { path: { benefit_id: pathId(benefitId) } },
          signal,
        }),
      ),
  });
}

/** The employee's benefit claims, newest first unless sorted. Former employees keep reading them. */
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
              benefit_id: benefitId ?? undefined,
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
