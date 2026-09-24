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
  /** An organization's Partner standing (directory): verified only when also active. */
  partnerProfile: {
    verified: {
      label: "Verified partner",
      intent: "success",
      description: "Verified by Aayulogic and active",
    },
    suspended: {
      label: "Suspended",
      intent: "danger",
      description: "Offers are offline until reinstated",
    },
    closed: { label: "Partner closed", intent: "neutral", description: "No longer a Partner" },
    draft: { label: "Partner draft", intent: "neutral", description: "Not yet submitted" },
    submitted: { label: "Partner submitted", intent: "info", description: "Awaiting review" },
    under_review: { label: "Partner in review", intent: "info", description: "Being reviewed" },
    changes_requested: {
      label: "Partner changes requested",
      intent: "warning",
      description: "The applicant must correct and resubmit",
    },
    rejected: { label: "Partner rejected", intent: "danger", description: "Not verified" },
  },
  /** Partner Management (ADR-017): verification by Aayulogic Governance. */
  partnerVerification: {
    draft: { label: "Draft", intent: "neutral", description: "Not yet submitted for verification" },
    submitted: { label: "Submitted", intent: "info", description: "Waiting for Aayulogic review" },
    under_review: { label: "Under review", intent: "info", description: "Aayulogic is reviewing" },
    changes_requested: {
      label: "Changes requested",
      intent: "warning",
      description: "Correct the details and resubmit",
    },
    verified: { label: "Verified", intent: "success", description: "Verified by Aayulogic" },
    rejected: { label: "Rejected", intent: "danger", description: "Verification not granted" },
  },
  /** Partner Management (ADR-017): operational standing, independent of verification. */
  partnerOperational: {
    active: { label: "Active", intent: "success", description: "Operating normally" },
    suspended: {
      label: "Suspended",
      intent: "danger",
      description: "Offers are offline until reinstated",
    },
    closed: { label: "Closed", intent: "neutral", description: "No longer a Partner" },
  },
  /** Verified AND active. Commercial entitlement and content approval are separate gates. */
  marketplaceEligibility: {
    eligible: {
      label: "Eligible",
      intent: "success",
      description: "Verified and active: may take part in the marketplace",
    },
    ineligible: {
      label: "Not eligible",
      intent: "warning",
      description: "Must be verified and active to take part in the marketplace",
    },
  },
  benefit: {
    draft: { label: "Draft", intent: "neutral", description: "Not visible to employees" },
    active: { label: "Active", intent: "success", description: "Visible to your employees" },
    paused: {
      label: "Paused",
      intent: "warning",
      description: "Hidden from employees until resumed",
    },
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
