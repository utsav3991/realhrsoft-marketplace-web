"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  ApiError,
  clearDeniedClients,
  clearDeniedOrganizations,
  getActiveClientId,
  getActiveOrganizationId,
  markClientDenied,
  markOrganizationDenied,
  setActiveClientId,
  setActiveOrganizationId,
  subscribeActiveClient,
  subscribeActiveOrganization,
} from "@/shared/api";

import { currentActorKey, fetchCurrentActor, type CurrentActor } from "./current-actor";
import { listenForLogoutElsewhere, login, logout, renewAccessToken } from "./session";
import { getAccessToken, subscribeAccessToken } from "./token-store";

export type SessionStatus = "loading" | "authenticated" | "anonymous" | "error";

export interface SessionValue {
  status: SessionStatus;
  actor: CurrentActor | null;
  error: unknown;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const SessionContext = createContext<SessionValue | null>(null);

const noToken = () => null;

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const token = useSyncExternalStore(subscribeAccessToken, getAccessToken, noToken);
  const organizationId = useSyncExternalStore(
    subscribeActiveOrganization,
    getActiveOrganizationId,
    noToken,
  );
  const clientId = useSyncExternalStore(subscribeActiveClient, getActiveClientId, noToken);
  const [restored, setRestored] = useState(false);

  // A reload loses the in-memory access token; the refresh cookie restores it.
  useEffect(() => {
    let active = true;
    const restore = getAccessToken() ? Promise.resolve(true) : renewAccessToken();
    void restore.finally(() => active && setRestored(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => listenForLogoutElsewhere(), []);

  // Signed out (logout, expiry, another tab): drop every cached read model and mutation
  // (whose variables can hold what an administrator typed).
  useEffect(() => {
    if (!token) queryClient.clear();
  }, [token, queryClient]);

  // A 403 from any call may mean this actor's grants changed since /auth/me was read.
  // Re-read it so navigation and action gating stop offering what the API now refuses.
  useEffect(() => {
    const refreshActorOnForbidden = (error: unknown) => {
      if (error instanceof ApiError && error.isForbidden) {
        void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    };
    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        if (event.query.queryKey[0] !== "auth") refreshActorOnForbidden(event.action.error);
      }
    });
    const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        refreshActorOnForbidden(event.action.error);
      }
    });
    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [queryClient]);

  const actorQuery = useQuery({
    queryKey: currentActorKey(organizationId, clientId),
    queryFn: fetchCurrentActor,
    enabled: restored && token !== null,
    staleTime: 60_000,
  });

  // The backend rejects an organization or client where this user is not a verified member
  // holding a grant. Remember the refusal so it is not selected automatically again. With both
  // selected the client is dropped first; a refusal that persists then drops the organization.
  const actorError = actorQuery.error;
  useEffect(() => {
    if (!(actorError instanceof ApiError && actorError.isForbidden)) return;
    if (clientId) {
      markClientDenied(clientId);
      setActiveClientId(null);
    } else if (organizationId) {
      markOrganizationDenied(organizationId);
      setActiveOrganizationId(null);
    }
  }, [actorError, organizationId, clientId]);

  const handleLogin = useCallback(
    async (credentials: { email: string; password: string }) => {
      queryClient.clear();
      clearDeniedOrganizations();
      clearDeniedClients();
      await login(credentials);
    },
    [queryClient],
  );

  const value = useMemo<SessionValue>(() => {
    let status: SessionStatus;
    if (!restored) status = "loading";
    else if (!token) status = "anonymous";
    else if (actorQuery.isPending) status = "loading";
    else if (actorQuery.isError) status = "error";
    else status = "authenticated";

    return {
      status,
      actor: status === "authenticated" ? (actorQuery.data ?? null) : null,
      error: actorQuery.error,
      login: handleLogin,
      logout,
    };
  }, [
    restored,
    token,
    actorQuery.isPending,
    actorQuery.isError,
    actorQuery.data,
    actorQuery.error,
    handleLogin,
  ]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside <SessionProvider>");
  return session;
}
