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
