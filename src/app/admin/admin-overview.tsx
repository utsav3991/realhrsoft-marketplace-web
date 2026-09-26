"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Gift,
  Handshake,
  KeyRound,
  ShieldCheck,
  Tag,
  Tags,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import {
  BenefitAdminPermission,
  Can,
  ClaimAdminPermission,
  EmploymentAdminPermission,
  IdentityPermission,
  OfferAdminPermission,
  OrganizationAdminPermission,
  PartnerAdminPermission,
  type PermissionCode,
} from "@/shared/authorization";

interface Section {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  permission: PermissionCode;
}

const SECTIONS: readonly Section[] = [
  {
    href: "/admin/users",
    title: "Users",
    description: "Find accounts, review their roles, and disable or reactivate them.",
    icon: Users,
    permission: IdentityPermission.USER_VIEW,
  },
  {
    href: "/admin/roles",
    title: "Roles",
    description: "Define roles and decide which permissions each one carries.",
    icon: ShieldCheck,
    permission: IdentityPermission.ROLE_VIEW,
  },
  {
    href: "/admin/permissions",
    title: "Permissions",
    description: "Browse every permission the platform enforces.",
    icon: KeyRound,
    permission: IdentityPermission.PERMISSION_VIEW,
  },
  {
    href: "/admin/organizations",
    title: "Organizations",
    description: "Organization identities and the verified portal members who may act for them.",
    icon: Building2,
    permission: OrganizationAdminPermission.ORGANIZATION_VIEW,
  },
  {
    href: "/admin/partners",
    title: "Partners",
    description: "Review partner registrations, verify or reject them, and register on behalf.",
    icon: Handshake,
    permission: PartnerAdminPermission.PARTNER_VIEW,
  },
  {
    href: "/admin/offers",
    title: "Offers",
    description: "Review submitted offers, publish on a partner's behalf, suspend or feature them.",
    icon: Tag,
    permission: OfferAdminPermission.OFFER_VIEW,
  },
  {
    href: "/admin/offer-categories",
    title: "Offer categories",
    description: "The categories offers are filed under; retire or reactivate them.",
    icon: Tags,
    permission: OfferAdminPermission.CATEGORY_VIEW,
  },
  {
    href: "/admin/claims",
    title: "Claims",
    description: "Every offer and benefit claim; accept or reject a pending one on a partner's behalf.",
    icon: Ticket,
    permission: ClaimAdminPermission.CLAIM_VIEW,
  },
  {
    href: "/admin/company-benefits",
    title: "Company benefits",
    description: "Every employer's benefits for its own employees; suspend or reinstate them.",
    icon: Gift,
    permission: BenefitAdminPermission.BENEFIT_VIEW,
  },
  {
    href: "/admin/employments",
    title: "Employments",
    description: "Record which organization employs each employee, opening the marketplace to them.",
    icon: BriefcaseBusiness,
    permission: EmploymentAdminPermission.EMPLOYMENT_VIEW,
  },
];

export function AdminOverview() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {SECTIONS.map((section) => (
        <Can key={section.href} permission={section.permission}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <section.icon className="text-primary size-4" aria-hidden />
                {section.title}
              </CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild variant="outline" size="sm">
                <Link href={section.href}>
                  Open {section.title.toLowerCase()} <ArrowRight aria-hidden />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </Can>
      ))}
    </div>
  );
}
