"use client";

import { ArrowRight, KeyRound, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Can, IdentityPermission, type PermissionCode } from "@/shared/authorization";

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
