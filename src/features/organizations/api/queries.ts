import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { api, pathId, unwrap } from "@/shared/api";

export const organizationKeys = {
  all: ["organizations"] as const,
  lists: () => [...organizationKeys.all, "list"] as const,
  list: (q: string) => [...organizationKeys.lists(), q] as const,
  detail: (id: string) => [...organizationKeys.all, "detail", id] as const,
  members: (id: string) => [...organizationKeys.all, "members", id] as const,
  // Portal reads are keyed by the organization they were fetched under.
  employerProfile: (organizationId: string) =>
    [...organizationKeys.all, "employer-profile", organizationId] as const,
};

const PAGE_SIZE = 50;

// --- Administration ------------------------------------------------------------------------

export function useOrganizations(q: string) {
  return useInfiniteQuery({
    queryKey: organizationKeys.list(q),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/admin/organizations", {
          params: {
            query: { q: q || undefined, cursor: pageParam ?? undefined, limit: PAGE_SIZE },
          },
          signal,
        }),
      ),
    getNextPageParam: (page) => page.next_cursor,
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

export function useMembers(organizationId: string) {
  return useQuery({
    queryKey: organizationKeys.members(organizationId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/organizations/{organization_id}/members", {
          params: { path: { organization_id: pathId(organizationId) } },
          signal,
        }),
      ),
  });
}

// --- Portals (organization-scoped) -------------------------------------------------------------

export function useEmployerProfile(organizationId: string) {
  return useQuery({
    queryKey: organizationKeys.employerProfile(organizationId),
    queryFn: ({ signal }) => unwrap(api.GET("/employer/profile", { signal })),
  });
}
