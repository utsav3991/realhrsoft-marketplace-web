import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { AdminClaims } from "@/features/claims/components/admin-claims";
import { ClaimAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Claims" };

export default function AdminClaimsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Claims"
        description="Every offer and benefit claim with its claimant, decision and voucher."
      />
      <RequirePermission anyOf={[ClaimAdminPermission.CLAIM_VIEW]}>
        <Suspense>
          <AdminClaims />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
