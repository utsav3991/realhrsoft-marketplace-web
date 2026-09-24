import { Badge, type BadgeProps } from "@/design-system/primitives/badge";

type Intent = NonNullable<BadgeProps["intent"]>;

interface StatusDefinition {
  label: string;
  intent: Intent;
  description: string;
}

/**
 * The single source of truth for how each domain status looks and reads, so no two screens
 * render "Pending review" differently. Add a domain here when its backend status exists.
 */
export const STATUS_DEFINITIONS = {
  user: {
    active: { label: "Active", intent: "success", description: "Can sign in" },
    disabled: { label: "Disabled", intent: "neutral", description: "Cannot sign in" },
  },
  role: {
    active: { label: "Active", intent: "success", description: "Can be granted" },
    retired: { label: "Retired", intent: "neutral", description: "Can no longer be granted" },
  },
  permission: {
    active: { label: "Active", intent: "success", description: "Can be added to roles" },
    retired: { label: "Retired", intent: "neutral", description: "Can no longer be added" },
  },
  employerProfile: {
    enabled: { label: "Employer", intent: "success", description: "Employer portal is open" },
    disabled: { label: "Employer off", intent: "neutral", description: "Employer portal closed" },
  },
  partnerProfile: {
    verified: {
      label: "Verified partner",
      intent: "success",
      description: "Verified by Aayulogic",
    },
    suspended: {
      label: "Suspended",
      intent: "danger",
      description: "Offers are offline until reinstated",
    },
  },
  application: {
    submitted: { label: "Submitted", intent: "info", description: "Waiting for Aayulogic review" },
    changes_requested: {
      label: "Changes requested",
      intent: "warning",
      description: "The applicant must correct and resubmit",
    },
    verified: { label: "Verified", intent: "success", description: "Partner profile created" },
    rejected: { label: "Rejected", intent: "danger", description: "Not accepted" },
  },
  benefit: {
    draft: { label: "Draft", intent: "neutral", description: "Not visible to employees" },
    active: { label: "Active", intent: "success", description: "Visible to your employees" },
    retired: { label: "Retired", intent: "neutral", description: "No longer offered" },
  },
  offer: {
    draft: { label: "Draft", intent: "neutral", description: "Not submitted for review" },
    submitted: { label: "In review", intent: "info", description: "Waiting for content review" },
    changes_requested: {
      label: "Changes requested",
      intent: "warning",
      description: "Edit and resubmit",
    },
    approved: { label: "Approved", intent: "success", description: "Content approved" },
    rejected: { label: "Rejected", intent: "danger", description: "Content not accepted" },
  },
  entitlement: {
    active: { label: "Active", intent: "success", description: "Commercial entitlement recorded" },
    revoked: { label: "Revoked", intent: "danger", description: "Entitlement revoked" },
    none: { label: "None", intent: "neutral", description: "No entitlement recorded" },
  },
} as const satisfies Record<string, Record<string, StatusDefinition>>;

export type StatusDomain = keyof typeof STATUS_DEFINITIONS;

interface StatusBadgeProps<D extends StatusDomain> {
  domain: D;
  status: string;
  className?: string;
}

export function StatusBadge<D extends StatusDomain>({
  domain,
  status,
  className,
}: StatusBadgeProps<D>) {
  const definitions: Record<string, StatusDefinition> = STATUS_DEFINITIONS[domain];
  const definition = definitions[status];
  if (!definition) {
    return (
      <Badge intent="outline" className={className}>
        {status}
      </Badge>
    );
  }
  return (
    <Badge intent={definition.intent} className={className} title={definition.description}>
      {definition.label}
    </Badge>
  );
}
