import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { GrantsDirectory } from "@/features/marketing/components/advertising-grants";
import { MarketingAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Advertising grants" };

export default function AdminAdvertisingGrantsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Advertising grants"
        description="Which organizations may submit advertisements, on what basis and for how long."
      />
      <RequirePermission anyOf={[MarketingAdminPermission.GRANT_VIEW]}>
        <Suspense>
          <GrantsDirectory />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
