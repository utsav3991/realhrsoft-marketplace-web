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
  getActiveOrganizationId,
  setActiveOrganizationId,
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

  // Signed out (logout, expiry, another tab): drop every cached read model.
  useEffect(() => {
    if (!token) queryClient.removeQueries();
  }, [token, queryClient]);

  const actorQuery = useQuery({
    queryKey: currentActorKey(organizationId),
    queryFn: fetchCurrentActor,
    enabled: restored && token !== null,
    staleTime: 60_000,
  });

  // The backend rejects an organization scope that is not assigned to this user.
  const actorError = actorQuery.error;
  useEffect(() => {
    if (organizationId && actorError instanceof ApiError && actorError.isForbidden) {
      setActiveOrganizationId(null);
    }
  }, [actorError, organizationId]);

  const handleLogin = useCallback(
    async (credentials: { email: string; password: string }) => {
      queryClient.removeQueries();
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
