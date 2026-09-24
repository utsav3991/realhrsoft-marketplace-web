import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import { organizationKeys } from "./queries";

function useInvalidateOrganization() {
  const queryClient = useQueryClient();
  return (organizationId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(organizationId) }),
      queryClient.invalidateQueries({ queryKey: organizationKeys.members(organizationId) }),
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() }),
    ]);
}

// --- Organizations and membership ------------------------------------------------------------

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["CreateOrganizationRequest"]) =>
      unwrap(api.POST("/admin/organizations", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.lists() }),
  });
}

export function useAddMember(organizationId: string) {
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: (body: Schemas["AddMemberRequest"]) =>
      unwrap(
        api.POST("/admin/organizations/{organization_id}/members", {
          params: { path: { organization_id: pathId(organizationId) } },
          body,
        }),
      ),
    onSettled: () => invalidate(organizationId),
  });
}

export function useRemoveMember(organizationId: string) {
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      unwrap(
        api.POST("/admin/organizations/{organization_id}/members/{user_id}/remove", {
          params: { path: { organization_id: pathId(organizationId), user_id: pathId(userId) } },
          body: { reason },
        }),
      ),
    onSettled: () => invalidate(organizationId),
  });
}

export function useChangeEmployerProfile(organizationId: string) {
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: ({ action, reason }: { action: "enable" | "disable"; reason: string }) =>
      unwrap(
        api.POST("/admin/organizations/{organization_id}/employer-profile/{action}", {
          params: { path: { organization_id: pathId(organizationId), action } },
          body: { reason },
        }),
      ),
    onSettled: () => invalidate(organizationId),
  });
}
