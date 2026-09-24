import {
  Building2,
  ClipboardCheck,
  FileText,
  Gift,
  Handshake,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Store,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Capacity, CurrentActor } from "@/shared/auth";
import {
  EmployerPermission,
  GLOBAL_PERMISSIONS,
  IdentityPermission,
  OrganizationAdminPermission,
  PartnerPermission,
  canAny,
  type PermissionCode,
} from "@/shared/authorization";

export type PortalId = "marketplace" | "partner" | "employer" | "admin";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown when the actor holds any of these. Omit for items every portal user sees. */
  anyOf?: readonly PermissionCode[];
  /** Check `anyOf` in the selected organization (portal permissions) instead of globally. */
  inOrganization?: boolean;
}

export interface Portal {
  id: PortalId;
  label: string;
  icon: LucideIcon;
  basePath: `/${PortalId}`;
  /** Capability-derived, never role- or actor_type-derived. UX only; the API decides. */
  canAccess: (actor: CurrentActor) => boolean;
  /** Offered in the switcher and as a landing page. Defaults to `canAccess`. */
  listed?: (actor: CurrentActor) => boolean;
  /** Organization capacity the portal acts for; its pages are scoped to one organization. */
  capacity?: Capacity;
  navigation: readonly NavItem[];
}

const hasCapacity = (actor: CurrentActor, capacity: Capacity) =>
  actor.memberships.some((membership) => membership[capacity]);

/** Every portal, in landing-preference order: specialised workspaces before the marketplace. */
export const PORTALS: readonly Portal[] = [
  {
    id: "admin",
    label: "Aayulogic Admin",
    icon: ShieldCheck,
    basePath: "/admin",
    // Global grants only: an organization grant never opens the console (ADR-014).
    canAccess: (actor) => canAny(actor, GLOBAL_PERMISSIONS),
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
      {
        href: "/admin/organizations",
        label: "Organizations",
        icon: Building2,
        anyOf: [OrganizationAdminPermission.ORGANIZATION_VIEW],
      },
      {
        href: "/admin/partners",
        label: "Partners",
        icon: Handshake,
        anyOf: [OrganizationAdminPermission.PARTNER_SEARCH],
      },
      {
        href: "/admin/offers",
        label: "Offer review",
        icon: ClipboardCheck,
        anyOf: [OrganizationAdminPermission.OFFER_REVIEW],
      },
    ],
  },
  {
    id: "partner",
    label: "Partner Portal",
    icon: Handshake,
    basePath: "/partner",
    // Any signed-in account may apply to become a Partner; the portal's own pages need a
    // verified Partner organization and grants there.
    canAccess: () => true,
    listed: (actor) => hasCapacity(actor, "partner"),
    capacity: "partner",
    navigation: [
      { href: "/partner", label: "Dashboard", icon: LayoutDashboard },
      {
        href: "/partner/offers",
        label: "Offers",
        icon: Tag,
        anyOf: [PartnerPermission.OFFER_VIEW],
        inOrganization: true,
      },
      {
        href: "/partner/profile",
        label: "Profile",
        icon: Building2,
        anyOf: [PartnerPermission.PROFILE_VIEW],
        inOrganization: true,
      },
      { href: "/partner/application", label: "Registration", icon: FileText },
    ],
  },
  {
    id: "employer",
    label: "Employer Portal",
    icon: Building2,
    basePath: "/employer",
    canAccess: (actor) => hasCapacity(actor, "employer"),
    capacity: "employer",
    navigation: [
      {
        href: "/employer",
        label: "Company benefits",
        icon: Gift,
        anyOf: [EmployerPermission.BENEFIT_VIEW],
        inOrganization: true,
      },
      {
        href: "/employer/profile",
        label: "Profile",
        icon: Building2,
        anyOf: [EmployerPermission.PROFILE_VIEW],
        inOrganization: true,
      },
    ],
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

/** Portals offered to the actor (switcher and landing). */
export function accessiblePortals(actor: CurrentActor | null): Portal[] {
  if (!actor) return [];
  return PORTALS.filter((portal) => (portal.listed ?? portal.canAccess)(actor));
}

/** Where a signed-in actor lands when no ?next= destination was requested. */
export function defaultPortalPath(actor: CurrentActor | null): string {
  return accessiblePortals(actor)[0]?.basePath ?? "/marketplace";
}

/** Whether a navigation item is offered to the actor. */
export function showsNavItem(actor: CurrentActor | null, item: NavItem): boolean {
  if (!item.anyOf) return true;
  const scope = item.inOrganization ? { organizationId: actor?.organization?.id ?? null } : {};
  return canAny(actor, item.anyOf, scope);
}
