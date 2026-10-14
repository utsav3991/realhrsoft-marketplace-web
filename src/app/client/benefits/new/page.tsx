import type { Metadata } from "next";

import { NewOwnBenefit } from "@/features/employer-benefits/components/own-benefits";
import { ClientBenefitPermission } from "@/shared/authorization/permission-codes";
import { RequireClient } from "@/shared/navigation/client-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "New client benefit" };

export default function ClientNewBenefitPage() {
  return (
    <RequireClient>
      <RequirePermission anyOf={[ClientBenefitPermission.BENEFIT_CREATE]} inClient>
        <NewOwnBenefit scope="client" />
      </RequirePermission>
    </RequireClient>
  );
}
