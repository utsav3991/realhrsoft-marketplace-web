import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminAd } from "@/features/marketing/components/advertisements";
import { isUuid } from "@/shared/api";
import { MarketingAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Advertisement" };

export default async function AdminAdvertisementPage({
  params,
}: {
  params: Promise<{ adId: string }>;
}) {
  const { adId } = await params;
  if (!isUuid(adId)) notFound();
  return (
    <RequirePermission anyOf={[MarketingAdminPermission.AD_VIEW]}>
      <Suspense>
        <AdminAd adId={adId} />
      </Suspense>
    </RequirePermission>
  );
}
