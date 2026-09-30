import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { AdminAds } from "@/features/marketing/components/advertisements";
import { MarketingAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Advertisements" };

export default function AdminAdvertisementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Advertisements"
        description="The advertisement review queue and every partner's advertisements, whatever their status."
      />
      <RequirePermission anyOf={[MarketingAdminPermission.AD_VIEW]}>
        <Suspense>
          <AdminAds />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
