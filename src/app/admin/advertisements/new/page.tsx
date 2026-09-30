import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminNewAd } from "@/features/marketing/components/advertisements";
import { MarketingAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "New advertisement" };

export default function AdminAdvertisementsNewPage() {
  return (
    <RequirePermission anyOf={[MarketingAdminPermission.AD_MANAGE]}>
      <Suspense>
        <AdminNewAd />
      </Suspense>
    </RequirePermission>
  );
}
