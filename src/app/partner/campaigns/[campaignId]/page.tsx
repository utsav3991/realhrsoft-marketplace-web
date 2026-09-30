import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OwnCampaign } from "@/features/marketing/components/campaigns";
import { isUuid } from "@/shared/api";
import { PartnerMarketingPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Campaign" };

export default async function PartnerCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  if (!isUuid(campaignId)) notFound();
  return (
    <RequireOrganization capacity="any">
      <RequirePermission anyOf={[PartnerMarketingPermission.CAMPAIGN_VIEW]} inOrganization>
        <Suspense>
          <OwnCampaign campaignId={campaignId} />
        </Suspense>
      </RequirePermission>
    </RequireOrganization>
  );
}
