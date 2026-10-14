import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SortOrdering } from "@/design-system/components/data-table";
import { api, pathId, unwrap, type Page, type Schemas } from "@/shared/api";

export type Partner = Schemas["Partner"];
export type PartnerDecision = Schemas["PartnerDecision"];
export type PartnerStatus = Partner["status"];
export type IntakePath = Partner["intake_path"];
export type PartnerSource = Partner["source"];
/** client: a RealHRSoft client group; merchant: a business registered here. Fixed for life. */
export type PartnerKind = Partner["kind"];

/** Partner columns the API sorts by (`ordering`). */
export const PARTNER_SORTS = ["business_name", "organization_name", "submitted_at"] as const;
export type PartnerOrdering = SortOrdering<(typeof PARTNER_SORTS)[number]>;

export interface PartnerFilters {
  search: string;
  kind: PartnerKind | null;
  status: PartnerStatus | null;
  intakePath: IntakePath | null;
  source: PartnerSource | null;
  ordering: PartnerOrdering | null;
}

export const partnerKeys = {
  all: ["partners"] as const,
  lists: () => [...partnerKeys.all, "list"] as const,
  list: (filters: PartnerFilters, page: Page) => [...partnerKeys.lists(), filters, page] as const,
  detail: (id: string) => [...partnerKeys.all, "detail", id] as const,
  decisions: (id: string) => [...partnerKeys.all, "decisions", id] as const,
  members: (id: string) => [...partnerKeys.all, "members", id] as const,
  // The selected organization's own registration (portal).
  own: (organizationId: string) => [...partnerKeys.all, "own", organizationId] as const,
  ownDecisions: (organizationId: string) =>
    [...partnerKeys.own(organizationId), "decisions"] as const,
};

/** The review queue and partner directory (Aayulogic administration). */
export function usePartners(filters: PartnerFilters, page: Page) {
  return useQuery({
    queryKey: partnerKeys.list(filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/partners", {
          params: {
            query: {
              search: filters.search || undefined,
              kind: filters.kind ?? undefined,
              status: filters.status ?? undefined,
              intake_path: filters.intakePath ?? undefined,
              source: filters.source ?? undefined,
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

export function usePartner(partnerId: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: partnerKeys.detail(partnerId),
    enabled,
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
export function usePartnerDecisions(partnerId: string, page: Page) {
  return useQuery({
    queryKey: [...partnerKeys.decisions(partnerId), page],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/partners/{partner_id}/decisions", {
          params: {
            path: { partner_id: pathId(partnerId) },
            query: { offset: page.offset, limit: page.limit },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
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

export function useOwnPartnerDecisions(organizationId: string, page: Page) {
  return useQuery({
    queryKey: [...partnerKeys.ownDecisions(organizationId), page],
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/partner/me/decisions", {
          params: {
            header: { "X-Organization-ID": organizationId },
            query: { offset: page.offset, limit: page.limit },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

/** A client's memberships, current and ended, newest first (platform administration). */
export function useClientMemberships(partnerId: string, page: Page, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...partnerKeys.members(partnerId), page],
    enabled,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/partners/{partner_id}/members", {
          params: {
            path: { partner_id: pathId(partnerId) },
            query: { offset: page.offset, limit: page.limit },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}
