import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { AdminVouchers } from "@/features/redemptions/components/admin-vouchers";
import { RedemptionAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Vouchers" };

export default function AdminVouchersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vouchers"
        description="Every voucher issued from an accepted claim, with its owner, use and revocation."
      />
      <RequirePermission anyOf={[RedemptionAdminPermission.VOUCHER_VIEW]}>
        <Suspense>
          <AdminVouchers />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
