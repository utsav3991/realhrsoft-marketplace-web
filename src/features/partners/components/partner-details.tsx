import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/primitives/card";
import { Detail, DetailList } from "@/shared/components/details";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDateTime } from "@/shared/lib/format";

import type { PartnerProfile } from "../api/queries";

const NONE = "—";

/** Verification, operational standing and marketplace eligibility, side by side. */
export function PartnerStandingBadges({
  verificationStatus,
  operationalStatus,
  marketplaceEligible,
}: {
  verificationStatus: string;
  operationalStatus: string;
  marketplaceEligible: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <StatusBadge domain="partnerVerification" status={verificationStatus} />
      <StatusBadge domain="partnerOperational" status={operationalStatus} />
      <StatusBadge
        domain="marketplaceEligibility"
        status={marketplaceEligible ? "eligible" : "ineligible"}
      />
    </div>
  );
}

/** Read-only business details; ``action`` renders in the header (for example an Edit button). */
export function PartnerBusinessCard({
  profile,
  action,
}: {
  profile: PartnerProfile;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <CardTitle>Business details</CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Legal name">{profile.legal_business_name}</Detail>
          <Detail label="Display name">{profile.display_name}</Detail>
          <Detail label="Registration number">{profile.registration_number ?? NONE}</Detail>
          <Detail label="Tax identifier">{profile.tax_identifier ?? NONE}</Detail>
          <Detail label="Website">{profile.website ?? NONE}</Detail>
          <Detail label="Last updated">{formatDateTime(profile.updated_at)}</Detail>
          {profile.description ? (
            <Detail label="Description" className="sm:col-span-2 lg:col-span-3">
              {profile.description}
            </Detail>
          ) : null}
        </DetailList>
      </CardContent>
    </Card>
  );
}
