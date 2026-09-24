import { CheckCircle2, CircleDashed } from "lucide-react";

import { Badge } from "@/design-system/primitives/badge";
import type { Schemas } from "@/shared/api";

type Publication = Schemas["PublicationResponse"];

const BLOCKERS: Record<string, string> = {
  partner_not_verified: "The Partner is not verified (or is suspended).",
  commercially_ineligible: "No active commercial entitlement.",
  content_not_approved: "This content has not been approved by Aayulogic.",
  not_yet_valid: "The validity period has not started.",
  expired: "The validity period has ended.",
};

export function LiveBadge({ publication }: { publication: Publication }) {
  return publication.live ? (
    <Badge intent="success">Live</Badge>
  ) : (
    <Badge intent="neutral">Not live</Badge>
  );
}

/**
 * RULE-02: live only when the Partner is verified AND commercially eligible AND this content is
 * approved, within its validity. The API evaluates the gates; this only explains them.
 */
export function PublicationPanel({ publication }: { publication: Publication }) {
  if (publication.live) {
    return (
      <p className="text-success flex items-center gap-2 text-sm">
        <CheckCircle2 className="size-4" aria-hidden />
        Live in the marketplace: all publication gates are met.
      </p>
    );
  }
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted-foreground">Not visible to marketplace users yet:</p>
      <ul className="space-y-1">
        {publication.blockers.map((blocker) => (
          <li key={blocker} className="flex items-start gap-2">
            <CircleDashed className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            {BLOCKERS[blocker] ?? blocker}
          </li>
        ))}
      </ul>
    </div>
  );
}
