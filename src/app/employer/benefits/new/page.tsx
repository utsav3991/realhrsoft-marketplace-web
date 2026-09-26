import type { Metadata } from "next";

import { NewOwnBenefit } from "@/features/employer-benefits/components/own-benefits";
import { EmployerBenefitPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "New benefit" };

export default function EmployerNewBenefitPage() {
  return (
    <RequireOrganization capacity="employer">
      <RequirePermission anyOf={[EmployerBenefitPermission.BENEFIT_CREATE]} inOrganization>
        <NewOwnBenefit />
      </RequirePermission>
    </RequireOrganization>
  );
}
