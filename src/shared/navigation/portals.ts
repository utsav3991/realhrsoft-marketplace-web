import {
  BadgeCheck,
  ChartColumn,
  BriefcaseBusiness,
  Building2,
  Gift,
  Handshake,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Store,
  Tag,
  Tags,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Capacity, CurrentActor } from "@/shared/auth";

import type { OrganizationFilter } from "./organization-scope";
import {
  AnalyticsAdminPermission,
  BenefitAdminPermission,
  ClaimAdminPermission,
  EmployerAnalyticsPermission,
  EmployerBenefitPermission,
  EmploymentAdminPermission,
  GLOBAL_PERMISSIONS,
  IdentityPermission,
  OfferAdminPermission,
  OrganizationAdminPermission,
  PartnerAdminPermission,
  PartnerAnalyticsPermission,
  PartnerClaimPermission,
  PartnerOfferPermission,
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
  /** Organizations the portal acts for; its pages are scoped to one organization. */
  capacity?: OrganizationFilter;
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
        anyOf: [PartnerAdminPermission.PARTNER_VIEW],
      },
      {
        href: "/admin/offers",
        label: "Offers",
        icon: Tag,
        anyOf: [OfferAdminPermission.OFFER_VIEW],
      },
      {
        href: "/admin/offer-categories",
        label: "Offer categories",
        icon: Tags,
        anyOf: [OfferAdminPermission.CATEGORY_VIEW],
      },
      {
        href: "/admin/claims",
        label: "Claims",
        icon: Ticket,
        anyOf: [ClaimAdminPermission.CLAIM_VIEW],
      },
      {
        href: "/admin/company-benefits",
        label: "Company benefits",
        icon: Gift,
        anyOf: [BenefitAdminPermission.BENEFIT_VIEW],
      },
      {
        href: "/admin/employments",
        label: "Employments",
        icon: BriefcaseBusiness,
        anyOf: [EmploymentAdminPermission.EMPLOYMENT_VIEW],
      },
      {
        href: "/admin/reports",
        label: "Reports",
        icon: ChartColumn,
        anyOf: [AnalyticsAdminPermission.OFFER_REPORT_VIEW],
      },
    ],
  },
  {
    id: "partner",
    label: "Partner Portal",
    icon: Handshake,
    basePath: "/partner",
    // Any selectable organization may apply (self-service registration happens here), so the
    // portal opens for every membership; the organization's grants decide what it shows.
    canAccess: (actor) => actor.memberships.length > 0,
    // Offered to registered partners and to organizations with no capacity yet (applicants).
    listed: (actor) => actor.memberships.some((m) => m.partner || !m.employer),
    capacity: "any",
    navigation: [
      { href: "/partner", label: "Dashboard", icon: LayoutDashboard },
      {
        href: "/partner/profile",
        label: "Business profile",
        icon: BadgeCheck,
        anyOf: [PartnerPermission.PROFILE_VIEW],
        inOrganization: true,
      },
      {
        href: "/partner/offers",
        label: "Offers",
        icon: Tag,
        anyOf: [PartnerOfferPermission.OFFER_VIEW],
        inOrganization: true,
      },
      {
        href: "/partner/claims",
        label: "Claims",
        icon: Ticket,
        // Deciding needs the queue, so viewing opens the page.
        anyOf: [PartnerClaimPermission.CLAIM_VIEW],
        inOrganization: true,
      },
      {
        href: "/partner/analytics",
        label: "Analytics",
        icon: ChartColumn,
        anyOf: [PartnerAnalyticsPermission.OFFER_REPORT_VIEW],
        inOrganization: true,
      },
    ],
  },
  {
    id: "employer",
    label: "Employer Portal",
    icon: Building2,
    basePath: "/employer",
    // Opens for organizations whose Employer capacity an administrator turned on.
    canAccess: (actor) => hasCapacity(actor, "employer"),
    capacity: "employer",
    navigation: [
      {
        href: "/employer/benefits",
        label: "Company benefits",
        icon: Gift,
        anyOf: [EmployerBenefitPermission.BENEFIT_VIEW],
        inOrganization: true,
      },
      {
        href: "/employer/reports",
        label: "Reports",
        icon: ChartColumn,
        anyOf: [EmployerAnalyticsPermission.BENEFIT_REPORT_VIEW],
        inOrganization: true,
      },
    ],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: Store,
    basePath: "/marketplace",
    // Open to every signed-in actor. Eligibility (an employee account with a current
    // employment) is not a permission code; the API decides it and answers 403 otherwise.
    canAccess: () => true,
    navigation: [
      { href: "/marketplace", label: "Discover", icon: Store },
      { href: "/marketplace/claims", label: "My offers", icon: Ticket },
      // Separate from offers (EMP-02): the employer's own benefits, not partner offers.
      { href: "/marketplace/company-benefits", label: "Company benefits", icon: Gift },
    ],
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
