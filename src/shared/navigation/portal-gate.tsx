"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "@/shared/auth";
import { canAny, type PermissionCode } from "@/shared/authorization";
import { ErrorState, ForbiddenState, LoadingState } from "@/shared/feedback/states";

import { getPortal, type PortalId } from "./portals";
import { loginPath } from "./safe-redirect";

/**
 * Route-level UX guard for a portal. It keeps anonymous visitors on the login page and shows
 * a forbidden view (keeping the URL) to actors without the portal's capability. It is not a
 * security boundary: every API call is authorized by the backend.
 */
export function PortalGate({
  portal: portalId,
  children,
}: {
  portal: PortalId;
  children: ReactNode;
}) {
  const { status, actor, error } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") {
      const { pathname, search } = window.location;
      router.replace(loginPath(`${pathname}${search}`));
    }
  }, [status, router]);

  if (status === "loading" || status === "anonymous") return <LoadingState />;
  if (status === "error" || !actor) {
    return (
      <div className="p-6">
        <ErrorState error={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }
  if (!getPortal(portalId).canAccess(actor)) {
    return (
      <div className="p-6">
        <ForbiddenState />
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * Page-level guard inside a portal, for pages that need a specific permission. Portal pages
 * pass `inOrganization` to check grants in the selected organization instead of global ones.
 */
export function RequirePermission({
  anyOf,
  inOrganization = false,
  children,
}: {
  anyOf: readonly PermissionCode[];
  inOrganization?: boolean;
  children: ReactNode;
}) {
  const { actor } = useSession();
  const scope = inOrganization ? { organizationId: actor?.organization?.id ?? null } : {};
  return canAny(actor, anyOf, scope) ? <>{children}</> : <ForbiddenState />;
}
