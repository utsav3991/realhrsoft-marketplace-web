import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { PartnerReceipts } from "@/features/redemptions/components/partner-receipts";
import { PartnerRedemptionPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Receipts" };

export default function PartnerReceiptsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts"
        description="Every voucher use your business confirmed, including uses Aayulogic later corrected."
      />
      <RequireOrganization capacity="any">
        <RequirePermission anyOf={[PartnerRedemptionPermission.REDEMPTION_VIEW]} inOrganization>
          <Suspense>
            <PartnerReceipts />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
