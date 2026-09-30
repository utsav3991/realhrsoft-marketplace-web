import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { AdminCampaigns } from "@/features/marketing/components/campaigns";
import { MarketingAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Campaigns" };

export default function AdminCampaignsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Every partner's advertising campaigns and their schedules."
      />
      <RequirePermission anyOf={[MarketingAdminPermission.CAMPAIGN_VIEW]}>
        <Suspense>
          <AdminCampaigns />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
