"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";

import {
  getActiveOrganizationId,
  setActiveOrganizationId,
  subscribeActiveOrganization,
} from "@/shared/api";

import { useSession } from "./session-provider";

/**
 * The organization every request is scoped to. Switching it resets cached queries, because
 * each was fetched under the previous X-Organization-ID.
 * The organizations a user may select come from `actor.memberships` (GET /auth/me).
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

/**
 * The organization the actor has selected and been re-read for. Portal components render only
 * inside <RequireOrganization>, which guarantees it; elsewhere this is a programming error.
 */
export function useSelectedOrganizationId(): string {
  const organizationId = useSession().actor?.organization?.id;
  if (!organizationId) throw new Error("useSelectedOrganizationId needs <RequireOrganization>");
  return organizationId;
}
