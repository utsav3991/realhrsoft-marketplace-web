import {
  BadgeCheck,
  ChartColumn,
  BriefcaseBusiness,
  Flag,
  Building2,
  Gift,
  Handshake,
  Inbox,
  Send,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  Network,
  OctagonPause,
  ReceiptText,
  RefreshCw,
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
  UserX,
  type LucideIcon,
} from "lucide-react";

import type { Capacity, CurrentActor } from "@/shared/auth";

import type { OrganizationFilter } from "./organization-scope";
import {
  AnalyticsAdminPermission,
  BenefitAdminPermission,
  BusinessAdminPermission,
  BusinessOfferPermission,
  ClaimAdminPermission,
  ClientAdministrationPermission,
  ClientAnalyticsPermission,
  ClientBenefitPermission,
  EmployerAnalyticsPermission,
  EmployerBenefitPermission,
  EmploymentAdminPermission,
  FeatureFlagAdminPermission,
  GLOBAL_PERMISSIONS,
  IdentityPermission,
  IntegrationAdminPermission,
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

export type PortalId =
  | "marketplace"
  | "partner"
  | "employer"
  | "business"
  | "client"
  | "admin";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown when the actor holds any of these. Omit for items every portal user sees. */
  anyOf?: readonly PermissionCode[];
  /** Check `anyOf` in the selected organization (portal permissions) instead of globally. */
  inOrganization?: boolean;
  /** Check `anyOf` in the selected client (Client portal permissions). */
  inClient?: boolean;
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
  /** Shown instead of the generic forbidden view when `canAccess` refuses. */
  denied?: { title: string; description: string };
  /** Organizations the portal acts for; its pages are scoped to one organization. */
  capacity?: OrganizationFilter;
  /** The portal acts for one client (X-Client-ID) instead of an organization. */
  clientScoped?: boolean;
  navigation: readonly NavGroup[];
}

const hasCapacity = (actor: CurrentActor, capacity: Capacity) =>
  actor.memberships.some((membership) => membership[capacity]);

/** Businesses post and browse business (B2B) offers: a partner or an employer organization. */
const isBusiness = (actor: CurrentActor) =>
  actor.memberships.some((membership) => membership.partner || membership.employer);

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
          {
            href: "/admin/business-offers",
            label: "Business offers",
            icon: BriefcaseBusiness,
            anyOf: [OfferAdminPermission.OFFER_VIEW],
          },
          {
            href: "/admin/business-enquiries",
            label: "Business enquiries",
            icon: Inbox,
            anyOf: [BusinessAdminPermission.ENQUIRY_VIEW],
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
        label: "RealHRSoft",
        items: [
          {
            href: "/admin/realhrsoft",
            label: "Sync",
            icon: RefreshCw,
            anyOf: [IntegrationAdminPermission.SYNC_VIEW],
          },
          {
            href: "/admin/employee-access",
            label: "Employee access",
            icon: UserX,
            anyOf: [IntegrationAdminPermission.EMPLOYEE_ACCESS_DENY],
          },
          {
            href: "/admin/feature-flags",
            label: "Feature flags",
            icon: Flag,
            anyOf: [FeatureFlagAdminPermission.FLAG_VIEW],
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
          {
            href: "/employer/benefits/from-group",
            label: "From your group",
            icon: Network,
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
    id: "business",
    label: "Business Portal",
    icon: BriefcaseBusiness,
    basePath: "/business",
    // Business (B2B) offers between organizations. The API accepts only a verified partner or
    // an employer; a pending partner registration opens the portal and the API explains.
    canAccess: isBusiness,
    capacity: "business",
    navigation: [
      {
        items: [{ href: "/business", label: "Overview", icon: LayoutDashboard }],
      },
      {
        label: "Selling",
        items: [
          {
            href: "/business/offers",
            label: "Business offers",
            icon: Tag,
            anyOf: [BusinessOfferPermission.OFFER_VIEW],
            inOrganization: true,
          },
          {
            href: "/business/leads",
            label: "Leads",
            icon: Inbox,
            anyOf: [BusinessOfferPermission.RECEIVED_ENQUIRY_VIEW],
            inOrganization: true,
          },
        ],
      },
      {
        label: "Buying",
        items: [
          {
            href: "/business/catalogue",
            label: "Browse offers",
            icon: Store,
            anyOf: [BusinessOfferPermission.CATALOGUE_VIEW],
            inOrganization: true,
          },
          {
            href: "/business/enquiries",
            label: "Sent enquiries",
            icon: Send,
            anyOf: [BusinessOfferPermission.SENT_ENQUIRY_VIEW],
            inOrganization: true,
          },
        ],
      },
    ],
  },
  {
    id: "client",
    label: "Client Portal",
    icon: Network,
    basePath: "/client",
    // A RealHRSoft group (a Partner and all its companies), for members holding a client role.
    canAccess: (actor) => actor.clients.length > 0,
    clientScoped: true,
    navigation: [
      {
        label: "Benefits",
        items: [
          {
            href: "/client/benefits",
            label: "Client benefits",
            icon: Gift,
            anyOf: [ClientBenefitPermission.BENEFIT_VIEW],
            inClient: true,
          },
        ],
      },
      {
        label: "Insights",
        items: [
          {
            href: "/client/reports",
            label: "Reports",
            icon: ChartColumn,
            anyOf: [ClientAnalyticsPermission.BENEFIT_REPORT_VIEW],
            inClient: true,
          },
        ],
      },
      {
        label: "Administration",
        items: [
          {
            href: "/client/members",
            label: "Members and roles",
            icon: Users,
            anyOf: [
              ClientAdministrationPermission.MEMBER_MANAGE,
              ClientAdministrationPermission.ROLE_MANAGE,
            ],
            inClient: true,
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
    // Employees are RealHRSoft identities, not Marketplace accounts: the employee API accepts
    // only RealHRSoft employee tokens, and RealHRSoft renders the employee experience through
    // its backend proxy. Nobody signing in here can use these pages, so the portal is closed.
    // Its components stay as the reference for the employee contract.
    canAccess: () => false,
    denied: {
      title: "The marketplace opens inside RealHRSoft",
      description:
        "Employees browse offers, claim benefits and show vouchers from RealHRSoft web and mobile. Accounts that sign in here manage partners, employers, clients and the platform.",
    },
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
  // With no portal, the closed marketplace explains where employees go instead.
  return accessiblePortals(actor)[0]?.basePath ?? "/marketplace";
}

/** Whether a navigation item is offered to the actor. */
export function showsNavItem(actor: CurrentActor | null, item: NavItem): boolean {
  if (!item.anyOf) return true;
  const scope = item.inClient
    ? { clientId: actor?.client?.id ?? null }
    : item.inOrganization
      ? { organizationId: actor?.organization?.id ?? null }
      : {};
  return canAny(actor, item.anyOf, scope);
}
