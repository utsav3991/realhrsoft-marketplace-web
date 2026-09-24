import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { BenefitsList } from "@/features/employer-benefits/components/benefits-list";
import { EmployerPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Company benefits" };

export default function EmployerBenefitsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Company benefits"
        description="Benefits your organization offers to its own employees. Publishing is yours to decide."
      />
      <RequireOrganization capacity="employer">
        <RequirePermission inOrganization anyOf={[EmployerPermission.BENEFIT_VIEW]}>
          <Suspense>
            <BenefitsList />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
