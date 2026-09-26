import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { AdminReports } from "@/features/analytics/components/admin-reports";
import { AnalyticsAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Reports" };

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Offer views, claims and redemptions across the marketplace, by offer and by employer."
      />
      <RequirePermission anyOf={[AnalyticsAdminPermission.OFFER_REPORT_VIEW]}>
        <Suspense>
          <AdminReports />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
