import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import { organizationKeys } from "./queries";

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["CreateOrganization"]) =>
      unwrap(api.POST("/admin/organizations", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.lists() }),
  });
}

export function useUpdateOrganization(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["UpdateOrganization"]) =>
      unwrap(
        api.PUT("/admin/organizations/{organization_id}", {
          params: { path: { organization_id: pathId(organizationId) } },
          body,
        }),
      ),
    // Refetch on failure too: a 409 means the loaded version is stale.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationKeys.detail(organizationId) }),
        queryClient.invalidateQueries({ queryKey: organizationKeys.lists() }),
      ]),
  });
}

function useInvalidateMemberships(organizationId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: organizationKeys.memberships(organizationId) });
}

export function useVerifyMembership(organizationId: string) {
  const invalidate = useInvalidateMemberships(organizationId);
  return useMutation({
    mutationFn: (body: Schemas["VerifyMembership"]) =>
      unwrap(
        api.POST("/admin/organizations/{organization_id}/memberships", {
          params: { path: { organization_id: pathId(organizationId) } },
          body,
        }),
      ),
    onSettled: invalidate,
  });
}

export function useEndMembership(organizationId: string) {
  const invalidate = useInvalidateMemberships(organizationId);
  return useMutation({
    mutationFn: ({ membershipId, reason }: { membershipId: string; reason: string }) =>
      unwrap(
        api.POST("/admin/organizations/{organization_id}/memberships/{membership_id}/end", {
          params: {
            path: { organization_id: pathId(organizationId), membership_id: pathId(membershipId) },
          },
          body: { reason },
        }),
      ),
    onSettled: invalidate,
  });
}
