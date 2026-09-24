import type { CurrentActor } from "@/shared/auth";

import type { PermissionCode } from "./permission-codes";

export interface PermissionScope {
  /** The organization owning the resource. Omit for platform-wide (global-only) checks. */
  organizationId?: string | null;
}

/**
 * Mirrors the backend's AuthorizationService.require: an unscoped check accepts only global
 * grants; a check scoped to an organization also accepts an organization grant when that
 * organization is the actor's selected one. UX only: the API remains the security boundary.
 */
export function can(
  actor: CurrentActor | null,
  permission: PermissionCode,
  scope: PermissionScope = {},
): boolean {
  if (!actor) return false;
  if (actor.globalPermissions.has(permission)) return true;
  const { organizationId } = scope;
  return (
    organizationId != null &&
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
