import { api, unwrap, type Schemas } from "@/shared/api";

/** An organization the user may select, and which capacities it currently has. */
export interface Membership {
  organizationId: string;
  name: string;
  employer: boolean;
  partner: boolean;
  /** Set when the membership comes through a client role (every company of the client). */
  viaClientId?: string | null;
}

/** A client (group) the user may select for the Client portal (X-Client-ID). */
export interface ClientAccess {
  clientId: string;
  name: string;
}

export type Capacity = "employer" | "partner";

/**
 * Frontend view of GET /auth/me. The backend contract is flat; here global and
 * organization permissions are kept structurally separate so they cannot be conflated.
 * actor_type is descriptive only and must never stand in for a permission check.
 * A membership says which organizations can be selected; it grants nothing by itself.
 */
export interface CurrentActor {
  id: string;
  actorType: string;
  authenticationSource: string;
  roles: readonly string[];
  globalPermissions: ReadonlySet<string>;
  organization: { id: string; permissions: ReadonlySet<string> } | null;
  memberships: readonly Membership[];
  /** The selected client and the client grants held there; kept apart like organizations. */
  client: { id: string; permissions: ReadonlySet<string> } | null;
  clients: readonly ClientAccess[];
}

export function toCurrentActor(response: Schemas["CurrentActor"]): CurrentActor {
  return {
    id: response.actor_id,
    actorType: response.actor_type,
    authenticationSource: response.authentication_source,
    roles: response.roles,
    globalPermissions: new Set(response.permissions),
    organization: response.organization_id
      ? {
          id: response.organization_id,
          permissions: new Set(response.organization_permissions),
        }
      : null,
    memberships: (response.memberships ?? []).map((membership) => ({
      organizationId: membership.organization_id,
      name: membership.name,
      employer: membership.employer,
      partner: membership.partner,
      viaClientId: membership.via_client_id ?? null,
    })),
    client: response.client_id
      ? { id: response.client_id, permissions: new Set(response.client_permissions ?? []) }
      : null,
    clients: (response.clients ?? []).map((client) => ({
      clientId: client.client_id,
      name: client.name,
    })),
  };
}

export const currentActorKey = (organizationId: string | null, clientId: string | null) =>
  ["auth", "me", organizationId, clientId] as const;

export async function fetchCurrentActor(): Promise<CurrentActor> {
  return toCurrentActor(await unwrap(api.GET("/auth/me")));
}
