import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { PartnerClaims } from "@/features/claims/components/partner-claims";
import { PartnerClaimPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Claims" };

export default function PartnerClaimsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Claims"
        description="Check the reference an employee shows you and confirm their redemption."
      />
      <RequireOrganization capacity="any">
        <RequirePermission
          anyOf={[PartnerClaimPermission.CLAIM_VIEW, PartnerClaimPermission.CLAIM_CONFIRM]}
          inOrganization
        >
          <Suspense>
            <PartnerClaims />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
