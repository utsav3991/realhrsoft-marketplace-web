import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { NewBenefit } from "@/features/employer-benefits/components/new-benefit";
import { EmployerPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "New benefit" };

export default function NewBenefitPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New benefit"
        description="Starts as a draft that only your organization's portal users can see."
      />
      <RequireOrganization capacity="employer">
        <RequirePermission inOrganization anyOf={[EmployerPermission.BENEFIT_CREATE]}>
          <NewBenefit />
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
