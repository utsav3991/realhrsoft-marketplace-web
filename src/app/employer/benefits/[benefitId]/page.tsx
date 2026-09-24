import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BenefitDetail } from "@/features/employer-benefits/components/benefit-detail";
import { isUuid } from "@/shared/api";
import { EmployerPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Benefit" };

export default async function BenefitPage({ params }: { params: Promise<{ benefitId: string }> }) {
  const { benefitId } = await params;
  if (!isUuid(benefitId)) notFound();
  return (
    <RequireOrganization capacity="employer">
      <RequirePermission inOrganization anyOf={[EmployerPermission.BENEFIT_VIEW]}>
        <BenefitDetail benefitId={benefitId} />
      </RequirePermission>
    </RequireOrganization>
  );
}
