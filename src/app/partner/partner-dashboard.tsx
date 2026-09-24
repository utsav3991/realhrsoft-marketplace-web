"use client";

import { ArrowRight, Building2, FileText, Handshake, Tag } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { OwnEntitlementCard } from "@/features/commercial/components/entitlement-card";
import { OwnPartnerStanding } from "@/features/partners/components/own-partner";
import { Can, PartnerPermission } from "@/shared/authorization";

/** Shown to accounts that are not members of any Partner organization yet. */
export function PartnerOnboarding() {
  return (
    <EmptyState
      icon={Handshake}
      title="Become a marketplace Partner"
      description="Register your business with its contacts and locations. Aayulogic verifies every Partner before its offers can reach marketplace users."
      action={
        <Button asChild>
          <Link href="/partner/application">
            <FileText aria-hidden />
            Register or check your registration
          </Link>
        </Button>
      }
    />
  );
}

const LINKS = [
  {
    href: "/partner/offers",
    title: "Offers",
    description: "Create offers and submit them for review.",
    icon: Tag,
    permission: PartnerPermission.OFFER_VIEW,
  },
  {
    href: "/partner/profile",
    title: "Profile",
    description: "Your verified business and contact details.",
    icon: Building2,
    permission: PartnerPermission.PROFILE_VIEW,
  },
] as const;

export function PartnerDashboard() {
  return (
    <div className="space-y-6">
      <Can inOrganization permission={PartnerPermission.PROFILE_VIEW}>
        <OwnPartnerStanding />
      </Can>
      <Can inOrganization permission={PartnerPermission.ENTITLEMENT_VIEW}>
        <OwnEntitlementCard />
      </Can>
      <div className="grid gap-4 sm:grid-cols-2">
        {LINKS.map((link) => (
          <Can key={link.href} inOrganization permission={link.permission}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <link.icon className="text-primary size-4" aria-hidden />
                  {link.title}
                </CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline" size="sm">
                  <Link href={link.href}>
                    Open {link.title.toLowerCase()} <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </Can>
        ))}
      </div>
    </div>
  );
}
