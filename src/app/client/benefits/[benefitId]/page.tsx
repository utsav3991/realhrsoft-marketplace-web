import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OwnBenefit } from "@/features/employer-benefits/components/own-benefits";
import { isUuid } from "@/shared/api";
import { ClientBenefitPermission } from "@/shared/authorization/permission-codes";
import { RequireClient } from "@/shared/navigation/client-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Client benefit" };

export default async function ClientBenefitPage({
  params,
}: {
  params: Promise<{ benefitId: string }>;
}) {
  const { benefitId } = await params;
  if (!isUuid(benefitId)) notFound();
  return (
    <RequireClient>
      <RequirePermission anyOf={[ClientBenefitPermission.BENEFIT_VIEW]} inClient>
        <OwnBenefit benefitId={benefitId} scope="client" />
      </RequirePermission>
    </RequireClient>
  );
}
