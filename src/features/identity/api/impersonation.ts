import { useMutation, useQueryClient } from "@tanstack/react-query";

import { impersonate, endImpersonation } from "@/shared/auth/session";
import type { Schemas } from "@/shared/api";

// A full navigation also drops component state and in-flight reads from the old account.
export function useImpersonate() {
  const cache = useQueryClient();
  return useMutation({
    gcTime: 0,
    mutationFn: async (body: Schemas["ImpersonateRequest"]) => {
      await impersonate(body);
      cache.clear();
      window.location.assign("/partner");
    },
  });
}

export function useEndImpersonation() {
  const cache = useQueryClient();
  return useMutation({
    gcTime: 0,
    mutationFn: async () => {
      const restored = await endImpersonation();
      cache.clear();
      window.location.assign(restored ? "/admin/users" : "/login");
    },
  });
}
