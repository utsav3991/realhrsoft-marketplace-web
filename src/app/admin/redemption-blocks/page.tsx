import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { RedemptionBlocks } from "@/features/redemptions/components/redemption-blocks";
import { RedemptionAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Redemption blocks" };

export default function RedemptionBlocksPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Redemption blocks"
        description="Emergency stops on using an offer's or a partner's vouchers. Block from the offer or partner page."
      />
      <RequirePermission anyOf={[RedemptionAdminPermission.BLOCK_VIEW]}>
        <Suspense>
          <RedemptionBlocks />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
