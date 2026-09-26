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
  /** Portal membership in an organization: current until an administrator ends it. */
  membership: {
    current: { label: "Current", intent: "success", description: "May act for the organization" },
    ended: { label: "Ended", intent: "neutral", description: "Membership was ended" },
  },
  /** Partner verification, and the outcome of each verification decision. */
  partner: {
    pending: { label: "Pending", intent: "warning", description: "Awaiting Aayulogic review" },
    verified: { label: "Verified", intent: "success", description: "Passed verification" },
    rejected: {
      label: "Rejected",
      intent: "danger",
      description: "Not accepted; can be edited and resubmitted",
    },
  },
  /** Offer badge: the stored status, except approved shows scheduled, active or expired. */
  offer: {
    draft: { label: "Draft", intent: "neutral", description: "Not submitted for review" },
    pending_review: {
      label: "Pending review",
      intent: "warning",
      description: "Awaiting Aayulogic content review",
    },
    changes_requested: {
      label: "Changes requested",
      intent: "warning",
      description: "Returned to the partner; edit and resubmit",
    },
    rejected: {
      label: "Rejected",
      intent: "danger",
      description: "Not accepted; can be edited and resubmitted",
    },
    scheduled: {
      label: "Scheduled",
      intent: "info",
      description: "Approved; visible from its start date",
    },
    active: { label: "Active", intent: "success", description: "Approved and inside its dates" },
    expired: { label: "Expired", intent: "neutral", description: "Approved; its end date passed" },
    suspended: {
      label: "Suspended",
      intent: "danger",
      description: "Hidden from employees by Aayulogic",
    },
  },
  /** The outcome of each offer moderation decision. */
  offerDecision: {
    approved: { label: "Approved", intent: "success", description: "Content approved" },
    changes_requested: {
      label: "Changes requested",
      intent: "warning",
      description: "Returned to the partner",
    },
    rejected: { label: "Rejected", intent: "danger", description: "Content rejected" },
    suspended: { label: "Suspended", intent: "danger", description: "Hidden from employees" },
    reinstated: { label: "Reinstated", intent: "success", description: "Approved again" },
  },
  offerCategory: {
    active: { label: "Active", intent: "success", description: "Offers can use it" },
    retired: {
      label: "Retired",
      intent: "neutral",
      description: "New and edited offers cannot use it",
    },
  },
  /** A claimed offer. Expired is derived: active and past the offer's end. */
  claim: {
    active: {
      label: "Active",
      intent: "success",
      description: "Can be redeemed with the partner until it expires",
    },
    used: { label: "Used", intent: "neutral", description: "Redemption confirmed" },
    expired: {
      label: "Expired",
      intent: "outline",
      description: "Not redeemed before the offer ended",
    },
  },
  /** Company Benefit badge: the stored status, except active shows scheduled or expired. */
  benefit: {
    draft: { label: "Draft", intent: "neutral", description: "Not published; employees cannot see it" },
    scheduled: {
      label: "Scheduled",
      intent: "info",
      description: "Published; employees see it from its start date",
    },
    active: { label: "Active", intent: "success", description: "Published and inside its dates" },
    expired: { label: "Expired", intent: "neutral", description: "Published; its end date passed" },
    suspended: {
      label: "Suspended",
      intent: "danger",
      description: "Hidden from employees by Aayulogic",
    },
    retired: { label: "Retired", intent: "outline", description: "Final; no longer offered" },
  },
  /** Interim employee eligibility: current until an administrator ends it. */
  employment: {
    current: {
      label: "Current",
      intent: "success",
      description: "Can browse and claim marketplace offers",
    },
    ended: {
      label: "Ended",
      intent: "neutral",
      description: "No marketplace access; claim history is kept",
    },
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
