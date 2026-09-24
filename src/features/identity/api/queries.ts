import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/shared/api";

export type UserStatusFilter = "active" | "disabled";

export interface UserListFilters {
  status?: UserStatusFilter;
  q?: string;
}

export const identityKeys = {
  all: ["identity"] as const,
  userLists: () => [...identityKeys.all, "users"] as const,
  users: (filters: UserListFilters) => [...identityKeys.userLists(), filters] as const,
  user: (userId: string) => [...identityKeys.all, "user", userId] as const,
  roles: () => [...identityKeys.all, "roles"] as const,
  role: (roleId: string) => [...identityKeys.all, "role", roleId] as const,
  permissions: () => [...identityKeys.all, "permissions"] as const,
};

const PAGE_SIZE = 50;

export function useUsers(filters: UserListFilters) {
  return useInfiniteQuery({
    queryKey: identityKeys.users(filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/admin/users", {
          params: {
            query: {
              status: filters.status,
              q: filters.q || undefined,
              cursor: pageParam ?? undefined,
              limit: PAGE_SIZE,
            },
          },
          signal,
        }),
      ),
    getNextPageParam: (page) => page.next_cursor,
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: identityKeys.user(userId),
    queryFn: ({ signal }) =>
      unwrap(api.GET("/admin/users/{user_id}", { params: { path: { user_id: userId } }, signal })),
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
      unwrap(api.GET("/admin/roles/{role_id}", { params: { path: { role_id: roleId } }, signal })),
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
