import {
  BadgeCheck,
  ChartColumn,
  BriefcaseBusiness,
  Building2,
  Gift,
  Handshake,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  OctagonPause,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Stamp,
  Store,
  Tag,
  Tags,
  Ticket,
  TicketCheck,
  Target,
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
  MarketingAdminPermission,
  OfferAdminPermission,
  OrganizationAdminPermission,
  PartnerAdminPermission,
  PartnerAnalyticsPermission,
  PartnerClaimPermission,
  PartnerMarketingPermission,
  PartnerOfferPermission,
  PartnerPermission,
  PartnerRedemptionPermission,
  RedemptionAdminPermission,
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

/** A sidebar section. Unlabelled groups sit under the brand with no heading. */
export interface NavGroup {
  label?: string;
  items: readonly NavItem[];
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
  navigation: readonly NavGroup[];
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
      {
        items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }],
      },
      {
        label: "Access",
        items: [
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
        label: "Organizations",
        items: [
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
            href: "/admin/employments",
            label: "Employments",
            icon: BriefcaseBusiness,
            anyOf: [EmploymentAdminPermission.EMPLOYMENT_VIEW],
          },
          {
            href: "/admin/company-benefits",
            label: "Company benefits",
            icon: Gift,
            anyOf: [BenefitAdminPermission.BENEFIT_VIEW],
          },
        ],
      },
      {
        label: "Offers",
        items: [
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
        ],
      },
      {
        label: "Redemptions",
        items: [
          {
            href: "/admin/vouchers",
            label: "Vouchers",
            icon: TicketCheck,
            anyOf: [RedemptionAdminPermission.VOUCHER_VIEW],
          },
          {
            href: "/admin/redemptions",
            label: "Receipts",
            icon: ReceiptText,
            anyOf: [RedemptionAdminPermission.REDEMPTION_VIEW],
          },
          {
            href: "/admin/redemption-blocks",
            label: "Redemption blocks",
            icon: OctagonPause,
            anyOf: [RedemptionAdminPermission.BLOCK_VIEW],
          },
        ],
      },
      {
        label: "Advertising",
        items: [
          {
            href: "/admin/advertisements",
            label: "Advertisements",
            icon: Megaphone,
            anyOf: [MarketingAdminPermission.AD_VIEW],
          },
          {
            href: "/admin/campaigns",
            label: "Campaigns",
            icon: Target,
            anyOf: [MarketingAdminPermission.CAMPAIGN_VIEW],
          },
          {
            href: "/admin/placement-slots",
            label: "Placement slots",
            icon: LayoutTemplate,
            anyOf: [MarketingAdminPermission.SLOT_VIEW],
          },
          {
            href: "/admin/advertising-grants",
            label: "Advertising grants",
            icon: Stamp,
            anyOf: [MarketingAdminPermission.GRANT_VIEW],
          },
        ],
      },
      {
        label: "Insights",
        items: [
          {
            href: "/admin/reports",
            label: "Reports",
            icon: ChartColumn,
            anyOf: [AnalyticsAdminPermission.OFFER_REPORT_VIEW],
          },
        ],
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
      {
        items: [
          { href: "/partner", label: "Dashboard", icon: LayoutDashboard },
          {
            href: "/partner/profile",
            label: "Business profile",
            icon: BadgeCheck,
            anyOf: [PartnerPermission.PROFILE_VIEW],
            inOrganization: true,
          },
        ],
      },
      {
        label: "Offers",
        items: [
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
        ],
      },
      {
        label: "Redemptions",
        items: [
          {
            href: "/partner/redeem",
            label: "Redeem",
            icon: ScanLine,
            anyOf: [
              PartnerRedemptionPermission.VOUCHER_VALIDATE,
              PartnerRedemptionPermission.VOUCHER_CONFIRM,
            ],
            inOrganization: true,
          },
          {
            href: "/partner/redemptions",
            label: "Receipts",
            icon: ReceiptText,
            anyOf: [PartnerRedemptionPermission.REDEMPTION_VIEW],
            inOrganization: true,
          },
        ],
      },
      {
        label: "Advertising",
        items: [
          {
            href: "/partner/campaigns",
            label: "Campaigns",
            icon: Target,
            anyOf: [PartnerMarketingPermission.CAMPAIGN_VIEW],
            inOrganization: true,
          },
          {
            href: "/partner/advertisements",
            label: "Advertisements",
            icon: Megaphone,
            anyOf: [PartnerMarketingPermission.AD_VIEW],
            inOrganization: true,
          },
        ],
      },
      {
        label: "Insights",
        items: [
          {
            href: "/partner/analytics",
            label: "Analytics",
            icon: ChartColumn,
            anyOf: [PartnerAnalyticsPermission.OFFER_REPORT_VIEW],
            inOrganization: true,
          },
        ],
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
        label: "Benefits",
        items: [
          {
            href: "/employer/benefits",
            label: "Company benefits",
            icon: Gift,
            anyOf: [EmployerBenefitPermission.BENEFIT_VIEW],
            inOrganization: true,
          },
        ],
      },
      {
        label: "Insights",
        items: [
          {
            href: "/employer/reports",
            label: "Reports",
            icon: ChartColumn,
            anyOf: [EmployerAnalyticsPermission.BENEFIT_REPORT_VIEW],
            inOrganization: true,
          },
        ],
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
      {
        items: [
          { href: "/marketplace", label: "Discover", icon: Store },
          // Separate from offers (EMP-02): the employer's own benefits, not partner offers.
          { href: "/marketplace/company-benefits", label: "Company benefits", icon: Gift },
        ],
      },
      {
        label: "My wallet",
        items: [
          { href: "/marketplace/claims", label: "My offers", icon: Ticket },
          { href: "/marketplace/vouchers", label: "My vouchers", icon: TicketCheck },
        ],
      },
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
