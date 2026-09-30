import type { Metadata } from "next";
import { Suspense } from "react";

import { NewOwnCampaign } from "@/features/marketing/components/campaigns";
import { PartnerMarketingPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "New campaign" };

export default function PartnerCampaignsNewPage() {
  return (
    <RequireOrganization capacity="any">
      <RequirePermission anyOf={[PartnerMarketingPermission.CAMPAIGN_MANAGE]} inOrganization>
        <Suspense>
          <NewOwnCampaign />
        </Suspense>
      </RequirePermission>
    </RequireOrganization>
  );
}
