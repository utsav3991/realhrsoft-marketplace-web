import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { BenefitUsage } from "@/features/analytics/components/benefit-usage";
import { ClientAnalyticsPermission } from "@/shared/authorization/permission-codes";
import { RequireClient } from "@/shared/navigation/client-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Reports" };

export default function ClientReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="How often employees of your companies use your client benefits, in total and per company, as counts without employee identity."
      />
      <RequireClient>
        <RequirePermission anyOf={[ClientAnalyticsPermission.BENEFIT_REPORT_VIEW]} inClient>
          <Suspense>
            <BenefitUsage scope="client" />
          </Suspense>
        </RequirePermission>
      </RequireClient>
    </div>
  );
}
