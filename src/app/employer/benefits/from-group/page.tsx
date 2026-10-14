import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { BenefitsFromClient } from "@/features/employer-benefits/components/own-benefits";
import { EmployerBenefitPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Benefits from your group" };

export default function EmployerGroupBenefitsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Benefits from your group"
        description="Benefits your client group publishes for this company's employees. Your group's administrators manage them; they appear to employees next to your own benefits."
      />
      <RequireOrganization capacity="employer">
        <RequirePermission anyOf={[EmployerBenefitPermission.BENEFIT_VIEW]} inOrganization>
          <Suspense>
            <BenefitsFromClient />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
