"use client";

import type { ReactNode } from "react";

import { useSession } from "@/shared/auth";

import type { PermissionCode } from "./permission-codes";
import { can, canAny, type PermissionScope } from "./permissions";

export function useCan(permission: PermissionCode, scope?: PermissionScope): boolean {
  return can(useSession().actor, permission, scope);
}

export function useCanAny(
  permissions: readonly PermissionCode[],
  scope?: PermissionScope,
): boolean {
  return canAny(useSession().actor, permissions, scope);
}

/** Portal check: the permission, granted in the organization the actor currently selects. */
export function useCanInOrganization(permission: PermissionCode): boolean {
  const { actor } = useSession();
  return can(actor, permission, { organizationId: actor?.organization?.id ?? null });
}

/** Client portal check: the permission, granted in the client the actor currently selects. */
export function useCanInClient(permission: PermissionCode): boolean {
  const { actor } = useSession();
  return can(actor, permission, { clientId: actor?.client?.id ?? null });
}

type CanProps = PermissionScope & {
  /** Check within the currently selected organization (portal actions). */
  inOrganization?: boolean;
  /** Check within the currently selected client (Client portal actions). */
  inClient?: boolean;
  children: ReactNode;
  /** Rendered when the permission is absent. Defaults to nothing. */
  fallback?: ReactNode;
} & (
    | { permission: PermissionCode; anyOf?: never }
    | { anyOf: readonly PermissionCode[]; permission?: never }
  );

/** Shows its children only when the actor holds the permission. Hiding is not authorization. */
export function Can({
  permission,
  anyOf,
  organizationId,
  clientId,
  inOrganization = false,
  inClient = false,
  fallback = null,
  children,
}: CanProps) {
  const { actor } = useSession();
  const scope = inClient
    ? { clientId: actor?.client?.id ?? null }
    : inOrganization
      ? { organizationId: actor?.organization?.id ?? null }
      : { organizationId, clientId };
  const allowed = anyOf ? canAny(actor, anyOf, scope) : can(actor, permission, scope);
  return <>{allowed ? children : fallback}</>;
}
