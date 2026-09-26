import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { AdminReceipts } from "@/features/redemptions/components/admin-receipts";
import { RedemptionAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Receipts" };

export default function AdminReceiptsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts"
        description="Every confirmed voucher use, how it was confirmed and any correction."
      />
      <RequirePermission anyOf={[RedemptionAdminPermission.REDEMPTION_VIEW]}>
        <Suspense>
          <AdminReceipts />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
