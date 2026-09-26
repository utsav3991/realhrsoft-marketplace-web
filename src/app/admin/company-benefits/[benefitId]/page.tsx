import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminBenefitRecord } from "@/features/employer-benefits/components/admin-benefits";
import { isUuid } from "@/shared/api";
import { BenefitAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Company benefit" };

export default async function AdminCompanyBenefitPage({
  params,
}: {
  params: Promise<{ benefitId: string }>;
}) {
  const { benefitId } = await params;
  if (!isUuid(benefitId)) notFound();
  return (
    <RequirePermission anyOf={[BenefitAdminPermission.BENEFIT_VIEW]}>
      <AdminBenefitRecord benefitId={benefitId} />
    </RequirePermission>
  );
}
