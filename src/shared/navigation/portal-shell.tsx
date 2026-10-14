"use client";

import { Check, ChevronsUpDown, LogOut, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useSyncExternalStore, type ReactNode } from "react";

import { FadeIn } from "@/design-system/components/motion";
import { Avatar, AvatarFallback } from "@/design-system/primitives/avatar";
import { Button } from "@/design-system/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/design-system/primitives/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/design-system/primitives/sidebar";
import { Switch } from "@/design-system/primitives/switch";
import { useSession } from "@/shared/auth";

import { ClientSwitcher } from "./client-scope";
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

function matches(pathname: string, item: NavItem, portal: Portal): boolean {
  if (item.href === portal.basePath) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** The deepest matching item is the active one, so a nested item does not light its parent. */
function activeHref(pathname: string, items: readonly NavItem[], portal: Portal): string | null {
  return (
    items
      .filter((item) => matches(pathname, item, portal))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null
  );
}

/** Logo block and product name; the workspace switcher when the actor has several portals. */
function SidebarBrand({ current }: { current: Portal }) {
  const { actor } = useSession();
  const { isMobile } = useSidebar();
  const portals = accessiblePortals(actor);

  const brand = (
    <>
      <span className="bg-primary text-primary-foreground shadow-ring flex size-8 shrink-0 items-center justify-center rounded-lg">
        <current.icon className="size-4" aria-hidden />
      </span>
      <span className="grid flex-1 text-left leading-tight">
        <span className="truncate text-sm font-semibold">RealHRsoft Marketplace</span>
        <span className="text-muted-foreground truncate text-xs">{current.label}</span>
      </span>
    </>
  );

  if (portals.length < 2) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild>
            <Link href={current.basePath}>{brand}</Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label="Switch workspace"
              className="data-[state=open]:bg-sidebar-accent"
            >
              {brand}
              <ChevronsUpDown className="text-muted-foreground ml-auto" aria-hidden />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={8}
            className="min-w-56"
          >
            <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
            {portals.map((portal) => (
              <DropdownMenuItem key={portal.id} asChild>
                <Link
                  href={portal.basePath}
                  aria-current={portal.id === current.id ? "page" : undefined}
                >
                  <portal.icon aria-hidden />
                  {portal.label}
                  {portal.id === current.id ? <Check className="ml-auto" aria-hidden /> : null}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function PortalNavigation({ portal }: { portal: Portal }) {
  const { actor } = useSession();
  const { isMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  // Groups the actor can see nothing in are dropped, heading and all.
  const groups = portal.navigation
    .map((group) => ({ ...group, items: group.items.filter((item) => showsNavItem(actor, item)) }))
    .filter((group) => group.items.length > 0);
  const current = activeHref(
    pathname,
    groups.flatMap((group) => group.items),
    portal,
  );

  return (
    <nav aria-label={`${portal.label} navigation`} className="flex flex-col gap-2">
      {groups.map((group, index) => (
        <div key={group.label ?? index} role="group" aria-label={group.label}>
          {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
          <SidebarMenu>
            {group.items.map((item) => {
              const active = item.href === current;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <item.icon aria-hidden />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </div>
      ))}
    </nav>
  );
}

function useSignOut() {
  const { logout } = useSession();
  const router = useRouter();
  return async () => {
    await logout();
    router.replace("/login");
  };
}

/** Sidebar footer: who is signed in, and sign out. */
function AccountMenu() {
  const { actor } = useSession();
  const { isMobile } = useSidebar();
  const signOut = useSignOut();
  const actorType = actor?.actorType ?? "user";
  const initial = actorType.charAt(0).toUpperCase();
  const roles = actor?.roles.join(", ") || "No roles";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label="Account"
              className="data-[state=open]:bg-sidebar-accent"
            >
              <Avatar className="size-8 shrink-0 rounded-lg">
                <AvatarFallback className="bg-primary/15 text-primary-deep rounded-lg text-xs font-bold">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <span className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold capitalize">{actorType}</span>
                <span className="text-muted-foreground truncate text-xs">{roles}</span>
              </span>
              <ChevronsUpDown className="ml-auto" aria-hidden />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "bottom" : "top"}
            align="end"
            sideOffset={8}
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
          >
            <DropdownMenuLabel className="font-medium">
              Signed in as <span className="font-mono">{actorType}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
              <LogOut aria-hidden />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

const subscribeNothing = () => () => {};

/** Sun/moon switch. Renders a placeholder until mounted, since the theme is only known then. */
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  if (!mounted) return <div className="h-6 w-16" aria-hidden />;
  const dark = resolvedTheme === "dark";
  return (
    <div className="flex items-center gap-2">
      <Sun className="text-muted-foreground size-4" aria-hidden />
      <Switch
        checked={dark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Dark mode"
      />
      <Moon className="text-muted-foreground size-4" aria-hidden />
    </div>
  );
}

function TopBar({ portal, actions }: { portal: Portal; actions?: ReactNode }) {
  const signOut = useSignOut();
  return (
    <header className="bg-background/80 sticky top-0 z-10 flex min-h-14 items-center gap-2 border-b px-3 py-2 backdrop-blur sm:px-4">
      <SidebarTrigger />
      {portal.capacity ? <OrganizationSwitcher capacity={portal.capacity} /> : null}
      {portal.clientScoped ? <ClientSwitcher /> : null}
      <div className="ml-auto flex items-center gap-2">
        {actions}
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void signOut()}
          aria-label="Sign out"
          title="Sign out"
          className="text-destructive hover:bg-danger-soft hover:text-destructive"
        >
          <LogOut aria-hidden />
        </Button>
      </div>
    </header>
  );
}

/** Page content eases in on each route change; the chrome around it stays put. */
function PortalMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <main className="flex-1 overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
        <FadeIn key={pathname}>{children}</FadeIn>
      </div>
    </main>
  );
}

/**
 * Gate + chrome for one portal. Each portal's layout.tsx renders exactly this. `actions` go in
 * the top bar (the notification bell), passed in by the route since features sit above shared.
 */
export function PortalLayout({
  portal: portalId,
  actions,
  children,
}: {
  portal: PortalId;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const portal = getPortal(portalId);
  return (
    <PortalGate portal={portalId}>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarBrand current={portal} />
          </SidebarHeader>
          <SidebarContent>
            <PortalNavigation portal={portal} />
          </SidebarContent>
          <SidebarFooter>
            <AccountMenu />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <TopBar portal={portal} actions={actions} />
          <PortalMain>{children}</PortalMain>
        </SidebarInset>
      </SidebarProvider>
    </PortalGate>
  );
}
