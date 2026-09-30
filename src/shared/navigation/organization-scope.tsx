"use client";

import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/design-system/primitives/dropdown-menu";
import { isOrganizationDenied, subscribeActiveOrganization } from "@/shared/api";
import { useActiveOrganization, useSession, type Capacity, type Membership } from "@/shared/auth";
import { LoadingState } from "@/shared/feedback/states";

/**
 * A capacity the organization must already have, "business" for either capacity (a partner or
 * an employer: the Business portal), or "any" selectable membership.
 */
export type OrganizationFilter = Capacity | "business" | "any";

const ORGANIZATIONS_LABEL: Record<OrganizationFilter, string> = {
  employer: "Employer organizations",
  partner: "Partner organizations",
  business: "Business organizations",
  any: "organizations",
};

/** Whether the membership's organization passes the filter. */
export function passesFilter(membership: Membership, capacity: OrganizationFilter): boolean {
  if (capacity === "any") return true;
  if (capacity === "business") return membership.partner || membership.employer;
  return membership[capacity];
}

/** Organizations where the actor is a member and the organization passes the filter. */
export function useCapableOrganizations(capacity: OrganizationFilter): readonly Membership[] {
  const { actor } = useSession();
  return (actor?.memberships ?? []).filter((membership) => passesFilter(membership, capacity));
}

function useDeniedFilter(memberships: readonly Membership[]) {
  // Re-render when a refusal is recorded (it notifies organization listeners).
  useSyncExternalStore(
    subscribeActiveOrganization,
    () => memberships.filter((m) => isOrganizationDenied(m.organizationId)).length,
    () => 0,
  );
  return memberships.filter((m) => !isOrganizationDenied(m.organizationId));
}

/** Header control to change the organization a portal acts for. */
export function OrganizationSwitcher({ capacity }: { capacity: OrganizationFilter }) {
  const candidates = useCapableOrganizations(capacity);
  const { organizationId, selectOrganization } = useActiveOrganization();
  const current = candidates.find((m) => m.organizationId === organizationId);

  if (candidates.length === 0) return null;
  if (candidates.length === 1 && current) {
    return (
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        <Building2 className="size-4" aria-hidden />
        {current.name}
      </span>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Switch organization">
          <Building2 aria-hidden />
          {current?.name ?? "Choose organization"}
          <ChevronsUpDown className="text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="first-letter:uppercase">
          {ORGANIZATIONS_LABEL[capacity]}
        </DropdownMenuLabel>
        {candidates.map((membership) => (
          <DropdownMenuItem
            key={membership.organizationId}
            onSelect={() => selectOrganization(membership.organizationId)}
          >
            {membership.organizationId === organizationId ? <Check aria-hidden /> : null}
            {membership.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Renders its children only once an organization with the capacity is selected and the actor
 * has been re-read for it. A single candidate is selected automatically. UX only: every
 * portal call is authorized by the backend against X-Organization-ID.
 */
export function RequireOrganization({
  capacity,
  empty,
  children,
}: {
  capacity: OrganizationFilter;
  /** Shown when the user belongs to no organization with this capacity. */
  empty?: ReactNode;
  children: ReactNode;
}) {
  const { actor } = useSession();
  const candidates = useCapableOrganizations(capacity);
  const selectable = useDeniedFilter(candidates);
  const { organizationId, selectOrganization } = useActiveOrganization();
  const active = candidates.find((m) => m.organizationId === organizationId);
  const only = selectable.length === 1 ? selectable[0] : undefined;

  useEffect(() => {
    if (!active && only) selectOrganization(only.organizationId);
  }, [active, only, selectOrganization]);

  if (active) {
    // /auth/me is re-read under the new organization before any portal data is requested.
    return actor?.organization?.id === active.organizationId ? <>{children}</> : <LoadingState />;
  }
  if (only) return <LoadingState />;
  if (candidates.length === 0) {
    return (
      <>
        {empty ?? (
          <EmptyState
            icon={Building2}
            title={`You are not a member of any ${ORGANIZATIONS_LABEL[capacity].replace(/s$/, "")}`}
            description="Aayulogic records organization memberships. Ask a platform administrator."
          />
        )}
      </>
    );
  }
  if (selectable.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No access in your organizations yet"
        description="You are a member, but no role has been granted to you there. Ask a platform administrator."
      />
    );
  }
  return (
    <EmptyState
      icon={Building2}
      title="Choose an organization"
      description={`You belong to more than one of these ${ORGANIZATIONS_LABEL[capacity]}.`}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {selectable.map((membership) => (
            <Button
              key={membership.organizationId}
              variant="outline"
              size="sm"
              onClick={() => selectOrganization(membership.organizationId)}
            >
              {membership.name}
            </Button>
          ))}
        </div>
      }
    />
  );
}
