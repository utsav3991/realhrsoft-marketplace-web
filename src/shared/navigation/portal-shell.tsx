"use client";

import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/design-system/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/design-system/primitives/dropdown-menu";
import { useSession } from "@/shared/auth";
import { cn } from "@/shared/lib/cn";

import { OrganizationSwitcher } from "./organization-scope";
import { PortalGate } from "./portal-gate";
import {
  accessiblePortals,
  getPortal,
  showsNavItem,
  type NavItem,
  type Portal,
  type PortalId,
} from "./portals";

function isActive(pathname: string, item: NavItem, portal: Portal): boolean {
  if (item.href === portal.basePath) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function PortalSwitcher({ current }: { current: Portal }) {
  const { actor } = useSession();
  const portals = accessiblePortals(actor);
  const Icon = current.icon;

  if (portals.length < 2) {
    return (
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className="text-primary size-4" aria-hidden />
        {current.label}
      </span>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Switch workspace">
          <Icon className="text-primary" aria-hidden />
          {current.label}
          <ChevronsUpDown className="text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
        {portals.map((portal) => (
          <DropdownMenuItem key={portal.id} asChild>
            <Link
              href={portal.basePath}
              aria-current={portal.id === current.id ? "page" : undefined}
            >
              <portal.icon aria-hidden />
              {portal.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountMenu() {
  const { actor, logout } = useSession();
  const router = useRouter();

  async function signOut() {
    await logout();
    router.replace("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Account">
          <UserRound aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="font-normal">
          Signed in as <span className="font-mono">{actor?.actorType}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PortalNavigation({ portal }: { portal: Portal }) {
  const { actor } = useSession();
  const pathname = usePathname();
  const items = portal.navigation.filter((item) => showsNavItem(actor, item));

  return (
    <nav aria-label={`${portal.label} navigation`}>
      <ul className="flex gap-1 overflow-x-auto md:flex-col">
        {items.map((item) => {
          const active = isActive(pathname, item, portal);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Gate + chrome for one portal. Each portal's layout.tsx renders exactly this. */
export function PortalLayout({
  portal: portalId,
  children,
}: {
  portal: PortalId;
  children: ReactNode;
}) {
  const portal = getPortal(portalId);
  return (
    <PortalGate portal={portalId}>
      <div className="flex min-h-dvh flex-col">
        <header className="bg-background/95 sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              RealHRsoft Marketplace
            </Link>
            <span className="text-border" aria-hidden>
              /
            </span>
            <PortalSwitcher current={portal} />
            {portal.capacity ? <OrganizationSwitcher capacity={portal.capacity} /> : null}
          </div>
          <AccountMenu />
        </header>
        <div className="flex flex-1 flex-col md:flex-row">
          <aside className="bg-sidebar border-b p-3 md:w-60 md:shrink-0 md:border-r md:border-b-0">
            <PortalNavigation portal={portal} />
          </aside>
          <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </PortalGate>
  );
}
