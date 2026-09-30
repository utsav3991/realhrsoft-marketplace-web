import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminNewCampaign } from "@/features/marketing/components/campaigns";
import { MarketingAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "New campaign" };

export default function AdminCampaignsNewPage() {
  return (
    <RequirePermission anyOf={[MarketingAdminPermission.CAMPAIGN_MANAGE]}>
      <Suspense>
        <AdminNewCampaign />
      </Suspense>
    </RequirePermission>
  );
}
