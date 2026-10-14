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
      // Account switching must discard mounted state and the Next.js router cache.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Intentional full document navigation across account boundaries.
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
