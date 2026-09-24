"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";

import {
  getActiveOrganizationId,
  setActiveOrganizationId,
  subscribeActiveOrganization,
} from "@/shared/api";

/**
 * The organization every request is scoped to. Switching it resets cached queries, because
 * each was fetched under the previous X-Organization-ID.
 * The backend does not yet list a user's organizations, so there is no switcher UI.
 */
export function useActiveOrganization() {
  const queryClient = useQueryClient();
  const organizationId = useSyncExternalStore(
    subscribeActiveOrganization,
    getActiveOrganizationId,
    () => null,
  );

  const selectOrganization = useCallback(
    (next: string | null) => {
      setActiveOrganizationId(next);
      void queryClient.resetQueries();
    },
    [queryClient],
  );

  return { organizationId, selectOrganization };
}
