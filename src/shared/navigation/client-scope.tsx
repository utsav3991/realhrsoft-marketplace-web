"use client";

import { Check, ChevronsUpDown, Network } from "lucide-react";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/design-system/primitives/dropdown-menu";
import { isClientDenied, subscribeActiveClient } from "@/shared/api";
import { useActiveClient, useSession, type ClientAccess } from "@/shared/auth";
import { LoadingState } from "@/shared/feedback/states";

function useSelectableClients(): {
  candidates: readonly ClientAccess[];
  selectable: readonly ClientAccess[];
} {
  const candidates = useSession().actor?.clients ?? [];
  // Re-render when a refusal is recorded (it notifies client listeners).
  useSyncExternalStore(
    subscribeActiveClient,
    () => candidates.filter((c) => isClientDenied(c.clientId)).length,
    () => 0,
  );
  return { candidates, selectable: candidates.filter((c) => !isClientDenied(c.clientId)) };
}

/** Header control to change the client (group) the Client portal acts for. */
export function ClientSwitcher() {
  const { candidates } = useSelectableClients();
  const { clientId, selectClient } = useActiveClient();
  const current = candidates.find((c) => c.clientId === clientId);

  if (candidates.length === 0) return null;
  if (candidates.length === 1 && current) {
    return (
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        <Network className="size-4" aria-hidden />
        {current.name}
      </span>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Switch client">
          <Network aria-hidden />
          {current?.name ?? "Choose client"}
          <ChevronsUpDown className="text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Clients</DropdownMenuLabel>
        {candidates.map((client) => (
          <DropdownMenuItem key={client.clientId} onSelect={() => selectClient(client.clientId)}>
            {client.clientId === clientId ? <Check aria-hidden /> : null}
            {client.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Renders its children only once a client is selected and the actor has been re-read for it
 * (GET /auth/me with X-Client-ID). A single candidate is selected automatically. UX only:
 * every client call is authorized by the backend against X-Client-ID.
 */
export function RequireClient({ children }: { children: ReactNode }) {
  const { actor } = useSession();
  const { candidates, selectable } = useSelectableClients();
  const { clientId, selectClient } = useActiveClient();
  const active = candidates.find((c) => c.clientId === clientId);
  const only = selectable.length === 1 ? selectable[0] : undefined;

  useEffect(() => {
    if (!active && only) selectClient(only.clientId);
  }, [active, only, selectClient]);

  if (active) {
    return actor?.client?.id === active.clientId ? <>{children}</> : <LoadingState />;
  }
  if (only) return <LoadingState />;
  if (selectable.length === 0) {
    return (
      <EmptyState
        icon={Network}
        title="No client access"
        description="You hold no client role in any group. Ask a platform administrator or your group's administrator."
      />
    );
  }
  return (
    <EmptyState
      icon={Network}
      title="Choose a client"
      description="You hold client roles in more than one group."
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {selectable.map((client) => (
            <Button
              key={client.clientId}
              variant="outline"
              size="sm"
              onClick={() => selectClient(client.clientId)}
            >
              {client.name}
            </Button>
          ))}
        </div>
      }
    />
  );
}
