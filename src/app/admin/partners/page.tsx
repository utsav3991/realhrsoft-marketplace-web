import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { PartnersDirectory } from "@/features/partners/components/partners-directory";
import { PartnerAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Partners" };

export default function AdminPartnersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Partners"
        description="The verification review queue and every partner registration."
      />
      <RequirePermission anyOf={[PartnerAdminPermission.PARTNER_VIEW]}>
        <Suspense>
          <PartnersDirectory />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
