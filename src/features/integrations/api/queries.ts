import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api, pathId, unwrap, type Page, type Schemas } from "@/shared/api";

// Aayulogic administration of the RealHRSoft integration: rollout switches, emergency
// employee-access blocks and the directory synchronization's health.
export type FeatureFlag = Schemas["FeatureFlag"];
export type AccessDenial = Schemas["AccessDenial"];
export type SyncStatus = Schemas["SyncStatus"];
export type SyncReceipt = Schemas["Receipt"];
export type ReconciliationRun = Schemas["ReconciliationRun"];
export type ReconciliationScope = Schemas["ReconciliationScopeEnum"];

export const integrationKeys = {
  flags: ["feature-flags"] as const,
  denials: ["employee-access-denials"] as const,
  denialPage: (page: Page) => [...integrationKeys.denials, page] as const,
  sync: ["realhrsoft-sync"] as const,
  syncStatus: () => [...integrationKeys.sync, "status"] as const,
  company: (externalId: string) => [...integrationKeys.sync, "company", externalId] as const,
};

/** Every known flag; a flag never switched reads as off. */
export function useFeatureFlags() {
  return useQuery({
    queryKey: integrationKeys.flags,
    queryFn: ({ signal }) => unwrap(api.GET("/admin/feature-flags", { signal })),
  });
}

export function useAccessDenials(page: Page) {
  return useQuery({
    queryKey: integrationKeys.denialPage(page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/employee-access/denials", {
          params: { query: { offset: page.offset, limit: page.limit } },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

/** Sync health; refreshed every 15 s while the page is open and visible. */
export function useSyncStatus() {
  return useQuery({
    queryKey: integrationKeys.syncStatus(),
    queryFn: ({ signal }) => unwrap(api.GET("/integrations/realhrsoft/sync-status", { signal })),
    refetchInterval: 15_000,
  });
}

/** A synchronized company by its RealHRSoft UUID (404 when never synchronized). */
export function useSyncedCompany(externalId: string | null) {
  return useQuery({
    queryKey: integrationKeys.company(externalId ?? ""),
    enabled: externalId !== null,
    retry: false,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/integrations/realhrsoft/companies/{company_id}", {
          params: { path: { company_id: pathId(externalId ?? "") } },
          signal,
        }),
      ),
  });
}
