import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { OwnBenefits } from "@/features/employer-benefits/components/own-benefits";
import { ClientBenefitPermission } from "@/shared/authorization/permission-codes";
import { RequireClient } from "@/shared/navigation/client-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Client benefits" };

export default function ClientBenefitsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Client benefits"
        description="Benefits your group offers to the employees of all its companies, or of the companies you select, and whether they can see them."
      />
      <RequireClient>
        <RequirePermission anyOf={[ClientBenefitPermission.BENEFIT_VIEW]} inClient>
          <Suspense>
            <OwnBenefits scope="client" />
          </Suspense>
        </RequirePermission>
      </RequireClient>
    </div>
  );
}
