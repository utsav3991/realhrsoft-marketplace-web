import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { PartnerAnalytics } from "@/features/analytics/components/partner-analytics";
import { PartnerAnalyticsPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Analytics" };

export default function PartnerAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="How employees view, claim and redeem your offers, as totals without employee identity."
      />
      <RequireOrganization capacity="any">
        <RequirePermission anyOf={[PartnerAnalyticsPermission.OFFER_REPORT_VIEW]} inOrganization>
          <Suspense>
            <PartnerAnalytics />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
