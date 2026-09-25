import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { api, nextOffset, PAGE_SIZE, pathId, unwrap, type Schemas } from "@/shared/api";

export type Partner = Schemas["Partner"];
export type PartnerDecision = Schemas["PartnerDecision"];
export type PartnerStatus = Partner["status"];
export type IntakePath = Partner["intake_path"];

export interface PartnerFilters {
  search: string;
  status: PartnerStatus | null;
  intakePath: IntakePath | null;
}

export const partnerKeys = {
  all: ["partners"] as const,
  lists: () => [...partnerKeys.all, "list"] as const,
  list: (filters: PartnerFilters) => [...partnerKeys.lists(), filters] as const,
  detail: (id: string) => [...partnerKeys.all, "detail", id] as const,
  decisions: (id: string) => [...partnerKeys.all, "decisions", id] as const,
  // The selected organization's own registration (portal).
  own: (organizationId: string) => [...partnerKeys.all, "own", organizationId] as const,
  ownDecisions: (organizationId: string) =>
    [...partnerKeys.own(organizationId), "decisions"] as const,
};

/** The review queue and partner directory (Aayulogic administration). */
export function usePartners(filters: PartnerFilters) {
  return useInfiniteQuery({
    queryKey: partnerKeys.list(filters),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/admin/partners", {
          params: {
            query: {
              search: filters.search || undefined,
              status: filters.status ?? undefined,
              intake_path: filters.intakePath ?? undefined,
              offset: pageParam,
              limit: PAGE_SIZE,
            },
          },
          signal,
        }),
      ),
    getNextPageParam: nextOffset,
  });
}

export function usePartner(partnerId: string) {
  return useQuery({
    queryKey: partnerKeys.detail(partnerId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/partners/{partner_id}", {
          params: { path: { partner_id: pathId(partnerId) } },
          signal,
        }),
      ),
  });
}

/** Every verify/reject decision on a partner, newest first. */
export function usePartnerDecisions(partnerId: string) {
  return useInfiniteQuery({
    queryKey: partnerKeys.decisions(partnerId),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/admin/partners/{partner_id}/decisions", {
          params: {
            path: { partner_id: pathId(partnerId) },
            query: { offset: pageParam, limit: PAGE_SIZE },
          },
          signal,
        }),
      ),
    getNextPageParam: nextOffset,
  });
}

/** The selected organization's partner registration; 404 when it has not registered. */
export function useOwnPartner(organizationId: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: partnerKeys.own(organizationId),
    enabled,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/partner/me", {
          params: { header: { "X-Organization-ID": organizationId } },
          signal,
        }),
      ),
  });
}

export function useOwnPartnerDecisions(organizationId: string) {
  return useInfiniteQuery({
    queryKey: partnerKeys.ownDecisions(organizationId),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/partner/me/decisions", {
          params: {
            header: { "X-Organization-ID": organizationId },
            query: { offset: pageParam, limit: PAGE_SIZE },
          },
          signal,
        }),
      ),
    getNextPageParam: nextOffset,
  });
}
