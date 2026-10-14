import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { AccessDenials } from "@/features/integrations/components/access-denials";
import { IntegrationAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Employee access" };

export default function AdminEmployeeAccessPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee access"
        description="Emergency blocks on RealHRSoft employees reaching the marketplace: one leaked token, or every token of one employee. RealHRSoft stays the authority; ask it to stop issuing tokens too."
      />
      <RequirePermission anyOf={[IntegrationAdminPermission.EMPLOYEE_ACCESS_DENY]}>
        <Suspense>
          <AccessDenials />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
