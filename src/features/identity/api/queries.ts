import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SortOrdering } from "@/design-system/components/data-table";
import { api, pathId, pathToken, unwrap, type Page } from "@/shared/api";

export type UserStatusFilter = "active" | "disabled";

/** User columns the API sorts by (`ordering`). */
export const USER_SORTS = ["email"] as const;

export interface UserListFilters {
  status?: UserStatusFilter;
  q?: string;
  ordering: SortOrdering<(typeof USER_SORTS)[number]> | null;
}

export const identityKeys = {
  all: ["identity"] as const,
  userLists: () => [...identityKeys.all, "users"] as const,
  users: (filters: UserListFilters, page: Page) =>
    [...identityKeys.userLists(), filters, page] as const,
  user: (userId: string) => [...identityKeys.all, "user", userId] as const,
  roles: () => [...identityKeys.all, "roles"] as const,
  role: (roleId: string) => [...identityKeys.all, "role", roleId] as const,
  permissions: () => [...identityKeys.all, "permissions"] as const,
};

export function useUsers(filters: UserListFilters, page: Page) {
  return useQuery({
    queryKey: identityKeys.users(filters, page),
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/users", {
          params: {
            query: {
              status: filters.status,
              q: filters.q || undefined,
              ordering: filters.ordering ?? undefined,
              offset: page.offset,
              limit: page.limit,
            },
          },
          signal,
        }),
      ),
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: identityKeys.user(userId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/users/{user_id}", {
          params: { path: { user_id: pathId(userId) } },
          signal,
        }),
      ),
  });
}

export function useRoles({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: identityKeys.roles(),
    queryFn: ({ signal }) => unwrap(api.GET("/admin/roles", { signal })),
    enabled,
  });
}

export function useRole(roleId: string) {
  return useQuery({
    queryKey: identityKeys.role(roleId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/roles/{role_id}", {
          params: { path: { role_id: pathId(roleId) } },
          signal,
        }),
      ),
  });
}

export function usePermissions({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: identityKeys.permissions(),
    queryFn: ({ signal }) => unwrap(api.GET("/admin/permissions", { signal })),
    // The catalogue changes only with a backend release.
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** Whether an invitation's password-setup link is still usable. Public: no session needed. */
export function usePasswordSetupLink(uidb64: string, token: string) {
  return useQuery({
    queryKey: [...identityKeys.all, "password-setup", uidb64, token] as const,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/users/auth/password-setup/{uidb64}/{token}/", {
          params: { path: { uidb64: pathToken(uidb64), token: pathToken(token) } },
          signal,
        }),
      ),
    // A link is single-use: never refetch it behind the form.
    staleTime: Infinity,
    retry: false,
  });
}
