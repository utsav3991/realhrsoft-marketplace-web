import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  ApiError,
  api,
  normalizeApiError,
  pathId,
  pathToken,
  unwrap,
  type Schemas,
} from "@/shared/api";

import { identityKeys } from "./queries";

type PermissionGrant = Schemas["PermissionGrant"];

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

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["CreateUserRequest"]) => unwrap(api.POST("/admin/users", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: identityKeys.userLists() }),
  });
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

/**
 * Completes an invitation. An invalid or expired link, or a password the backend rejects,
 * answers 400 with a plain `{ message }` rather than Problem Details; surface that message.
 */
export function useSetPassword(uidb64: string, token: string) {
  return useMutation({
    mutationFn: async (body: Schemas["SetPasswordRequest"]) => {
      const { data, error, response } = await api.POST(
        "/users/auth/password-setup/{uidb64}/{token}/",
        { params: { path: { uidb64: pathToken(uidb64), token: pathToken(token) } }, body },
      );
      if (response.ok && data) return data;
      if (response.status === 400 && error && typeof error.message === "string") {
        throw new ApiError({
          status: 400,
          code: "BAD_REQUEST",
          title: "Password not set",
          detail: error.message,
        });
      }
      throw normalizeApiError(error, response);
    },
  });
}
