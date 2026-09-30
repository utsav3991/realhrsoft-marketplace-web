import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { OwnAds } from "@/features/marketing/components/advertisements";
import { PartnerMarketingPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Advertisements" };

export default function PartnerAdvertisementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Advertisements"
        description="Your advertisements, their review status and where they appear."
      />
      <RequireOrganization capacity="any">
        <RequirePermission anyOf={[PartnerMarketingPermission.AD_VIEW]} inOrganization>
          <Suspense>
            <OwnAds />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
