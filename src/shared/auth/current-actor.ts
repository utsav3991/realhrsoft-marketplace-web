import { api, unwrap, type Schemas } from "@/shared/api";

/** An organization the user may select, and which capacities it currently has. */
export interface Membership {
  organizationId: string;
  name: string;
  employer: boolean;
  partner: boolean;
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
    })),
  };
}

export const currentActorKey = (organizationId: string | null) =>
  ["auth", "me", organizationId] as const;

export async function fetchCurrentActor(): Promise<CurrentActor> {
  return toCurrentActor(await unwrap(api.GET("/auth/me")));
}
