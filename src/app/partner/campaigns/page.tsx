import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { OwnCampaigns } from "@/features/marketing/components/campaigns";
import { PartnerMarketingPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Campaigns" };

export default function PartnerCampaignsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Your advertising campaigns: their schedules and the advertisements in them."
      />
      <RequireOrganization capacity="any">
        <RequirePermission anyOf={[PartnerMarketingPermission.CAMPAIGN_VIEW]} inOrganization>
          <Suspense>
            <OwnCampaigns />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
