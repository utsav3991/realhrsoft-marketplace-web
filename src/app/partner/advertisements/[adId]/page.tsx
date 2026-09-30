import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OwnAd } from "@/features/marketing/components/advertisements";
import { isUuid } from "@/shared/api";
import { PartnerMarketingPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Advertisement" };

export default async function PartnerAdvertisementPage({
  params,
}: {
  params: Promise<{ adId: string }>;
}) {
  const { adId } = await params;
  if (!isUuid(adId)) notFound();
  return (
    <RequireOrganization capacity="any">
      <RequirePermission anyOf={[PartnerMarketingPermission.AD_VIEW]} inOrganization>
        <Suspense>
          <OwnAd adId={adId} />
        </Suspense>
      </RequirePermission>
    </RequireOrganization>
  );
}
