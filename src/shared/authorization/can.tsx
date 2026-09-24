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

type CanProps = PermissionScope & {
  children: ReactNode;
  /** Rendered when the permission is absent. Defaults to nothing. */
  fallback?: ReactNode;
} & (
    | { permission: PermissionCode; anyOf?: never }
    | { anyOf: readonly PermissionCode[]; permission?: never }
  );

/** Shows its children only when the actor holds the permission. Hiding is not authorization. */
export function Can({ permission, anyOf, organizationId, fallback = null, children }: CanProps) {
  const { actor } = useSession();
  const allowed = anyOf
    ? canAny(actor, anyOf, { organizationId })
    : can(actor, permission, { organizationId });
  return <>{allowed ? children : fallback}</>;
}
