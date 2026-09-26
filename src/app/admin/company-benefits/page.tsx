import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { AdminBenefits } from "@/features/employer-benefits/components/admin-benefits";
import { BenefitAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Company benefits" };

export default function AdminCompanyBenefitsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Company benefits"
        description="Every employer's benefits for its own employees. Employers publish without review; suspend any that break the rules."
      />
      <RequirePermission anyOf={[BenefitAdminPermission.BENEFIT_VIEW]}>
        <Suspense>
          <AdminBenefits />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
