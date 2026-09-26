import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SortOrdering } from "@/design-system/components/data-table";
import { api, pathId, unwrap, type Page } from "@/shared/api";

/** Organization and membership columns the API sorts by (`ordering`). */
export const ORGANIZATION_SORTS = ["name", "created_at", "updated_at"] as const;
export type OrganizationOrdering = SortOrdering<(typeof ORGANIZATION_SORTS)[number]>;
export const MEMBERSHIP_SORTS = ["verified_at", "ended_at"] as const;
export type MembershipOrdering = SortOrdering<(typeof MEMBERSHIP_SORTS)[number]>;

export interface OrganizationFilters {
  search: string;
  ordering: OrganizationOrdering | null;
}

export const organizationKeys = {
  all: ["organizations"] as const,
  lists: () => [...organizationKeys.all, "list"] as const,
  list: (filters: OrganizationFilters, page: Page) =>
    [...organizationKeys.lists(), filters, page] as const,
  detail: (id: string) => [...organizationKeys.all, "detail", id] as const,
  memberships: (id: string) => [...organizationKeys.all, "memberships", id] as const,
};

export function useOrganizations(filters: OrganizationFilters, page: Page) {
  return useQuery({
    queryKey: organizationKeys.list(filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/organizations", {
          params: {
            query: {
              search: filters.search || undefined,
              ordering: filters.ordering ?? undefined,
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

export function useOrganization(organizationId: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: organizationKeys.detail(organizationId),
    enabled,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/organizations/{organization_id}", {
          params: { path: { organization_id: pathId(organizationId) } },
          signal,
        }),
      ),
  });
}

/** Current and ended portal memberships, most recently verified first. */
export function useMemberships(
  organizationId: string,
  ordering: MembershipOrdering | null,
  page: Page,
) {
  return useQuery({
    queryKey: [...organizationKeys.memberships(organizationId), ordering, page],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/organizations/{organization_id}/memberships", {
          params: {
            path: { organization_id: pathId(organizationId) },
            query: { ordering: ordering ?? undefined, offset: page.offset, limit: page.limit },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}
