import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, pathId, pathKey, unwrap, type Schemas } from "@/shared/api";

import { integrationKeys } from "./queries";

/** Switches one rollout flag; audited with the reason. */
export function useSwitchFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, ...body }: Schemas["FeatureFlagInput"] & { key: string }) =>
      unwrap(
        api.POST("/admin/feature-flags/{key}", {
          params: { path: { key: pathKey(key) } },
          body,
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: integrationKeys.flags }),
  });
}

export function useCreateAccessDenial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["AccessDenialInput"]) =>
      unwrap(api.POST("/admin/employee-access/denials", { body })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: integrationKeys.denials }),
  });
}

export function useLiftAccessDenial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ denialId, reason }: { denialId: string; reason: string }) =>
      unwrap(
        api.POST("/admin/employee-access/denials/{denial_id}/lift", {
          params: { path: { denial_id: pathId(denialId) } },
          body: { reason },
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: integrationKeys.denials }),
  });
}

/** Queues a reconciliation run; it reads from RealHRSoft in the background. */
export function useReconcile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["Reconcile"]) =>
      unwrap(api.POST("/integrations/realhrsoft/reconcile", { body })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: integrationKeys.sync }),
  });
}

/** Returns quarantined or dead events to the queue, after their cause is fixed. */
export function useRedriveSyncEvents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["Redrive"]) =>
      unwrap(api.POST("/integrations/realhrsoft/events/redrive", { body })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: integrationKeys.sync }),
  });
}
