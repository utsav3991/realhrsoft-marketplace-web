import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { OwnPartnerProfile } from "@/features/partners/components/own-partner";
import { PartnerPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Business profile" };

export default function PartnerProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Business profile"
        description="What Aayulogic verifies, its current status and every review decision."
      />
      <RequireOrganization capacity="any">
        <RequirePermission anyOf={[PartnerPermission.PROFILE_VIEW]} inOrganization>
          <Suspense>
            <OwnPartnerProfile />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
