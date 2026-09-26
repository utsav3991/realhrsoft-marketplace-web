import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { BenefitUsage } from "@/features/analytics/components/benefit-usage";
import { EmployerAnalyticsPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Reports" };

export default function EmployerReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="How often your employees use your company benefits, as counts without employee identity."
      />
      <RequireOrganization capacity="employer">
        <RequirePermission
          anyOf={[EmployerAnalyticsPermission.BENEFIT_REPORT_VIEW]}
          inOrganization
        >
          <Suspense>
            <BenefitUsage />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
