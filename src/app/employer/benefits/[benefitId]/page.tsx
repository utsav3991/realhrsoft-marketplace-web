import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OwnBenefit } from "@/features/employer-benefits/components/own-benefits";
import { isUuid } from "@/shared/api";
import { EmployerBenefitPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Benefit" };

export default async function EmployerBenefitPage({
  params,
}: {
  params: Promise<{ benefitId: string }>;
}) {
  const { benefitId } = await params;
  if (!isUuid(benefitId)) notFound();
  return (
    <RequireOrganization capacity="employer">
      <RequirePermission anyOf={[EmployerBenefitPermission.BENEFIT_VIEW]} inOrganization>
        <OwnBenefit benefitId={benefitId} />
      </RequirePermission>
    </RequireOrganization>
  );
}
