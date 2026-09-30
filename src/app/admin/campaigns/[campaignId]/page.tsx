import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminCampaign } from "@/features/marketing/components/campaigns";
import { isUuid } from "@/shared/api";
import { MarketingAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Campaign" };

export default async function AdminCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  if (!isUuid(campaignId)) notFound();
  return (
    <RequirePermission anyOf={[MarketingAdminPermission.CAMPAIGN_VIEW]}>
      <Suspense>
        <AdminCampaign campaignId={campaignId} />
      </Suspense>
    </RequirePermission>
  );
}
