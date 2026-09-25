import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { api, nextOffset, PAGE_SIZE, pathId, unwrap } from "@/shared/api";

export const organizationKeys = {
  all: ["organizations"] as const,
  lists: () => [...organizationKeys.all, "list"] as const,
  list: (search: string) => [...organizationKeys.lists(), search] as const,
  detail: (id: string) => [...organizationKeys.all, "detail", id] as const,
  memberships: (id: string) => [...organizationKeys.all, "memberships", id] as const,
};

export function useOrganizations(search: string) {
  return useInfiniteQuery({
    queryKey: organizationKeys.list(search),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/admin/organizations", {
          params: {
            query: { search: search || undefined, offset: pageParam, limit: PAGE_SIZE },
          },
          signal,
        }),
      ),
    getNextPageParam: nextOffset,
  });
}

export function useOrganization(organizationId: string) {
  return useQuery({
    queryKey: organizationKeys.detail(organizationId),
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
export function useMemberships(organizationId: string) {
  return useInfiniteQuery({
    queryKey: organizationKeys.memberships(organizationId),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/admin/organizations/{organization_id}/memberships", {
          params: {
            path: { organization_id: pathId(organizationId) },
            query: { offset: pageParam, limit: PAGE_SIZE },
          },
          signal,
        }),
      ),
    getNextPageParam: nextOffset,
  });
}
