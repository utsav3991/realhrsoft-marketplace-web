"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";

import { getActiveClientId, setActiveClientId, subscribeActiveClient } from "@/shared/api";

import { useSession } from "./session-provider";

/**
 * The client every Client-portal request is scoped to. Switching it resets cached queries,
 * because each was fetched under the previous X-Client-ID. Selectable clients come from
 * `actor.clients` (GET /auth/me).
 */
export function useActiveClient() {
  const queryClient = useQueryClient();
  const clientId = useSyncExternalStore(subscribeActiveClient, getActiveClientId, () => null);

  const selectClient = useCallback(
    (next: string | null) => {
      setActiveClientId(next);
      void queryClient.resetQueries();
    },
    [queryClient],
  );

  return { clientId, selectClient };
}

/** The client the actor has selected and been re-read for; only inside <RequireClient>. */
export function useSelectedClientId(): string {
  const clientId = useSession().actor?.client?.id;
  if (!clientId) throw new Error("useSelectedClientId needs <RequireClient>");
  return clientId;
}
