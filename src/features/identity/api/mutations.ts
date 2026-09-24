import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import { identityKeys } from "./queries";

type PermissionGrant = Schemas["PermissionGrantBody"];

/** A user's status and grants appear in the directory, the detail view and role counts. */
function useInvalidateUser() {
  const queryClient = useQueryClient();
  return (userId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: identityKeys.user(userId) }),
      queryClient.invalidateQueries({ queryKey: identityKeys.userLists() }),
      queryClient.invalidateQueries({ queryKey: identityKeys.roles() }),
    ]);
}

export function useDisableUser(userId: string) {
  const invalidate = useInvalidateUser();
  return useMutation({
    mutationFn: ({ reason }: { reason: string }) =>
      unwrap(
        api.POST("/admin/users/{user_id}/disable", {
          params: { path: { user_id: pathId(userId) } },
          body: { reason },
        }),
      ),
    onSettled: () => invalidate(userId),
  });
}

export function useReactivateUser(userId: string) {
  const invalidate = useInvalidateUser();
  return useMutation({
    mutationFn: ({ reason }: { reason: string }) =>
      unwrap(
        api.POST("/admin/users/{user_id}/reactivate", {
          params: { path: { user_id: pathId(userId) } },
          body: { reason },
        }),
      ),
    onSettled: () => invalidate(userId),
  });
}

export function useAssignRole(userId: string) {
  const invalidate = useInvalidateUser();
  return useMutation({
    mutationFn: ({
      roleId,
      organizationId,
      reason,
    }: {
      roleId: string;
      /** Organization roles only: the organization the grant is scoped to. */
      organizationId?: string | null;
      reason: string;
    }) =>
      unwrap(
        api.POST("/admin/users/{user_id}/roles", {
          params: { path: { user_id: pathId(userId) } },
          // Platform-wide grants omit the field entirely.
          body: organizationId
            ? { role_id: roleId, organization_id: organizationId, reason }
            : { role_id: roleId, reason },
        }),
      ),
    onSettled: () => invalidate(userId),
  });
}

export function useRevokeRole(userId: string) {
  const invalidate = useInvalidateUser();
  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason: string }) =>
      unwrap(
        api.POST("/admin/users/{user_id}/roles/{assignment_id}/revoke", {
          params: { path: { user_id: pathId(userId), assignment_id: pathId(assignmentId) } },
          body: { reason },
        }),
      ),
    onSettled: () => invalidate(userId),
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["CreateRoleRequest"]) => unwrap(api.POST("/admin/roles", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityKeys.roles() }),
  });
}

export function useReplaceRolePermissions(roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { version: number; permissions: PermissionGrant[]; reason: string }) =>
      unwrap(
        api.PUT("/admin/roles/{role_id}/permissions", {
          params: { path: { role_id: pathId(roleId) } },
          body,
        }),
      ),
    // Refetch on failure too: a 409 means the loaded version is stale.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: identityKeys.role(roleId) }),
        queryClient.invalidateQueries({ queryKey: identityKeys.roles() }),
      ]),
  });
}
