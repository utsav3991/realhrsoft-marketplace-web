import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { OwnBenefits } from "@/features/employer-benefits/components/own-benefits";
import { SLOTS, SponsoredBanner } from "@/features/marketing/components/sponsored-placement";
import { EmployerBenefitPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Company benefits" };

export default function EmployerBenefitsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Company benefits"
        description="Benefits your organization offers to its own employees, and whether they can see them."
      />
      <SponsoredBanner slotKey={SLOTS.appHomeTop} />
      <RequireOrganization capacity="employer">
        <RequirePermission anyOf={[EmployerBenefitPermission.BENEFIT_VIEW]} inOrganization>
          <Suspense>
            <OwnBenefits />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
