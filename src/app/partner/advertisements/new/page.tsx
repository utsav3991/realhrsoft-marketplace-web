import type { Metadata } from "next";
import { Suspense } from "react";

import { NewOwnAd } from "@/features/marketing/components/advertisements";
import { PartnerMarketingPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "New advertisement" };

export default function PartnerAdvertisementsNewPage() {
  return (
    <RequireOrganization capacity="any">
      <RequirePermission anyOf={[PartnerMarketingPermission.AD_MANAGE]} inOrganization>
        <Suspense>
          <NewOwnAd />
        </Suspense>
      </RequirePermission>
    </RequireOrganization>
  );
}
