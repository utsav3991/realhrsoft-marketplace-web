import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, pathId, unwrap, type Schemas } from "@/shared/api";

export const commercialKeys = {
  all: ["commercial"] as const,
  entitlement: (organizationId: string) =>
    [...commercialKeys.all, "entitlement", organizationId] as const,
  own: (organizationId: string) => [...commercialKeys.all, "own", organizationId] as const,
};

/** Administrative read. A 404 means the organization has no Partner profile. */
export function useEntitlement(organizationId: string) {
  return useQuery({
    queryKey: commercialKeys.entitlement(organizationId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/organizations/{organization_id}/entitlement", {
          params: { path: { organization_id: pathId(organizationId) } },
          signal,
        }),
      ),
    retry: false,
  });
}

/** Partner portal read for the selected organization. */
export function useOwnEntitlement(organizationId: string) {
  return useQuery({
    queryKey: commercialKeys.own(organizationId),
    queryFn: ({ signal }) => unwrap(api.GET("/partner/entitlement", { signal })),
  });
}

function useInvalidateEntitlement(organizationId: string) {
  const queryClient = useQueryClient();
  // Offer publication depends on this gate, so offer reads refresh too.
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: commercialKeys.entitlement(organizationId) }),
      queryClient.invalidateQueries({ queryKey: ["offers"] }),
    ]);
}

export function useGrantEntitlement(organizationId: string) {
  const invalidate = useInvalidateEntitlement(organizationId);
  return useMutation({
    mutationFn: (body: Schemas["GrantEntitlementRequest"]) =>
      unwrap(
        api.PUT("/admin/organizations/{organization_id}/entitlement", {
          params: { path: { organization_id: pathId(organizationId) } },
          body,
        }),
      ),
    onSettled: invalidate,
  });
}

export function useRevokeEntitlement(organizationId: string) {
  const invalidate = useInvalidateEntitlement(organizationId);
  return useMutation({
    mutationFn: ({ reason }: { reason: string }) =>
      unwrap(
        api.POST("/admin/organizations/{organization_id}/entitlement/revoke", {
          params: { path: { organization_id: pathId(organizationId) } },
          body: { reason },
        }),
      ),
    onSettled: invalidate,
  });
}
