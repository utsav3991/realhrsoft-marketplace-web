import {
  Building2,
  Gift,
  Handshake,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { CurrentActor } from "@/shared/auth";
import { IdentityPermission, canAny, type PermissionCode } from "@/shared/authorization";

export type PortalId = "marketplace" | "partner" | "employer" | "admin";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown when the actor holds any of these. Omit for items every portal user sees. */
  anyOf?: readonly PermissionCode[];
}

export interface Portal {
  id: PortalId;
  label: string;
  icon: LucideIcon;
  basePath: `/${PortalId}`;
  /** Capability-derived, never role- or actor_type-derived. UX only; the API decides. */
  canAccess: (actor: CurrentActor) => boolean;
  navigation: readonly NavItem[];
}

const ADMIN_CONSOLE_PERMISSIONS = Object.values(IdentityPermission);

/** Every portal, in landing-preference order: specialised workspaces before the marketplace. */
export const PORTALS: readonly Portal[] = [
  {
    id: "admin",
    label: "Aayulogic Admin",
    icon: ShieldCheck,
    basePath: "/admin",
    canAccess: (actor) => canAny(actor, ADMIN_CONSOLE_PERMISSIONS),
    navigation: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      {
        href: "/admin/users",
        label: "Users",
        icon: Users,
        anyOf: [IdentityPermission.USER_VIEW],
      },
      {
        href: "/admin/roles",
        label: "Roles",
        icon: ShieldCheck,
        anyOf: [IdentityPermission.ROLE_VIEW],
      },
      {
        href: "/admin/permissions",
        label: "Permissions",
        icon: KeyRound,
        anyOf: [IdentityPermission.PERMISSION_VIEW],
      },
    ],
  },
  {
    id: "partner",
    label: "Partner Portal",
    icon: Handshake,
    basePath: "/partner",
    // No partner capability exists in the backend yet. Enable with its permission codes.
    canAccess: () => false,
    navigation: [{ href: "/partner", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "employer",
    label: "Employer Portal",
    icon: Building2,
    basePath: "/employer",
    // No employer capability exists in the backend yet. Enable with its permission codes.
    canAccess: () => false,
    navigation: [{ href: "/employer", label: "Company benefits", icon: Gift }],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: Store,
    basePath: "/marketplace",
    // Browsing is open to every signed-in actor; claiming and eligibility are API decisions.
    canAccess: () => true,
    navigation: [{ href: "/marketplace", label: "Discover", icon: Store }],
  },
];

export function getPortal(id: PortalId): Portal {
  const portal = PORTALS.find((candidate) => candidate.id === id);
  if (!portal) throw new Error(`Unknown portal: ${id}`);
  return portal;
}

export function accessiblePortals(actor: CurrentActor | null): Portal[] {
  return actor ? PORTALS.filter((portal) => portal.canAccess(actor)) : [];
}

/** Where a signed-in actor lands when no ?next= destination was requested. */
export function defaultPortalPath(actor: CurrentActor | null): string {
  return accessiblePortals(actor)[0]?.basePath ?? "/marketplace";
}
