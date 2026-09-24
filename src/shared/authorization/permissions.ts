import type { CurrentActor } from "@/shared/auth";

import type { PermissionCode } from "./permission-codes";

export interface PermissionScope {
  /**
   * The organization the check is about. Omit for platform-wide checks (global grants only);
   * pass it for portal checks (grants in that organization only).
   */
  organizationId?: string | null;
}

/**
 * Mirrors the backend (ADR-014): `AuthorizationService.require` accepts only global grants and
 * `require_organization` only grants in the selected organization. A global grant never opens a
 * portal and an organization grant never opens the admin console. UX only: the API decides.
 */
export function can(
  actor: CurrentActor | null,
  permission: PermissionCode,
  scope: PermissionScope = {},
): boolean {
  if (!actor) return false;
  const { organizationId } = scope;
  if (organizationId === undefined) return actor.globalPermissions.has(permission);
  return (
    organizationId !== null &&
    actor.organization?.id === organizationId &&
    actor.organization.permissions.has(permission)
  );
}

export function canAny(
  actor: CurrentActor | null,
  permissions: readonly PermissionCode[],
  scope: PermissionScope = {},
): boolean {
  return permissions.some((permission) => can(actor, permission, scope));
}
