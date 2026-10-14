import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { EmploymentsDirectory } from "@/features/employments/components/employments";
import { EmploymentAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Employments" };

export default function AdminEmploymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Employments"
        description="Which companies employ each RealHRSoft employee, as synchronized from RealHRSoft. Read-only: RealHRSoft owns employment."
      />
      <RequirePermission anyOf={[EmploymentAdminPermission.EMPLOYMENT_VIEW]}>
        <Suspense>
          <EmploymentsDirectory />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
