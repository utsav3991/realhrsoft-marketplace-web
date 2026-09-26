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
  /**
   * Offer badge (display_status): retired, suspended or paused first; then, with a live
   * version, scheduled/active/expired by its window; otherwise the working version's state.
   */
  offer: {
    draft: { label: "Draft", intent: "neutral", description: "Not submitted for review" },
    in_review: {
      label: "In review",
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
      description: "Not accepted; edit to start a new draft",
    },
    retracted: {
      label: "Retracted",
      intent: "neutral",
      description: "Taken out of review; edit to start a new draft",
    },
    scheduled: {
      label: "Scheduled",
      intent: "info",
      description: "Published; visible from its start date",
    },
    active: { label: "Active", intent: "success", description: "Published and inside its dates" },
    expired: { label: "Expired", intent: "neutral", description: "Published; its end date passed" },
    paused: { label: "Paused", intent: "warning", description: "Hidden by its owner until resumed" },
    suspended: {
      label: "Suspended",
      intent: "danger",
      description: "Hidden from employees by Aayulogic",
    },
    retired: { label: "Retired", intent: "outline", description: "Final; no new claims" },
  },
  /** One version of an offer's terms. Only a draft is edited; the others are frozen. */
  offerVersion: {
    draft: { label: "Draft", intent: "neutral", description: "Editable" },
    in_review: { label: "In review", intent: "warning", description: "Frozen for review" },
    changes_requested: {
      label: "Changes requested",
      intent: "warning",
      description: "Frozen; edit to start a new draft",
    },
    rejected: { label: "Rejected", intent: "danger", description: "Frozen; not approved" },
    retracted: { label: "Retracted", intent: "neutral", description: "Taken out of review" },
    approved: { label: "Approved", intent: "success", description: "Authorized terms" },
  },
  /** The outcome of each offer publication or moderation decision. */
  offerDecision: {
    approved: { label: "Approved", intent: "success", description: "Terms approved" },
    changes_requested: {
      label: "Changes requested",
      intent: "warning",
      description: "Returned to the owner",
    },
    rejected: { label: "Rejected", intent: "danger", description: "Terms rejected" },
    suspended: { label: "Suspended", intent: "danger", description: "Hidden from employees" },
    reinstated: { label: "Reinstated", intent: "success", description: "Suspension lifted" },
  },
  offerCategory: {
    active: { label: "Active", intent: "success", description: "Offers can use it" },
    retired: {
      label: "Retired",
      intent: "neutral",
      description: "New and edited offers cannot use it",
    },
  },
  /** A claim decision. Accepted never turns into used: the voucher or use records that. */
  claim: {
    requested: {
      label: "Awaiting approval",
      intent: "warning",
      description: "The partner decides before the deadline",
    },
    accepted: {
      label: "Accepted",
      intent: "success",
      description: "A voucher was issued, or one benefit use recorded",
    },
    rejected: { label: "Rejected", intent: "danger", description: "The request was declined" },
    expired: {
      label: "Expired",
      intent: "outline",
      description: "No decision before the deadline",
    },
    cancelled: { label: "Cancelled", intent: "neutral", description: "Withdrawn by the employee" },
  },
  /** The voucher an accepted marketplace claim issues; used only once the partner confirms. */
  voucher: {
    available: { label: "Available", intent: "success", description: "Usable now" },
    not_yet_valid: {
      label: "Not yet valid",
      intent: "info",
      description: "Usable from its start date",
    },
    used: { label: "Used", intent: "neutral", description: "The partner confirmed use" },
    expired: { label: "Expired", intent: "outline", description: "Not used before it ended" },
    revoked: { label: "Revoked", intent: "danger", description: "Withdrawn; cannot be used" },
    reversed: {
      label: "Reversed",
      intent: "warning",
      description: "The confirmed use was corrected",
    },
  },
  /** Company Benefit badge: the same display status as an offer, without review states. */
  benefit: {
    draft: { label: "Draft", intent: "neutral", description: "Not published; employees cannot see it" },
    scheduled: {
      label: "Scheduled",
      intent: "info",
      description: "Published; employees see it from its start date",
    },
    active: { label: "Active", intent: "success", description: "Published and inside its dates" },
    expired: { label: "Expired", intent: "neutral", description: "Published; its end date passed" },
    paused: { label: "Paused", intent: "warning", description: "Hidden by the employer until resumed" },
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
