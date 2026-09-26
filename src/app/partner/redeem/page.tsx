import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { RedeemCounter } from "@/features/redemptions/components/redeem-counter";
import { PartnerRedemptionPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Redeem" };

export default function PartnerRedeemPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Redeem"
        description="Check a customer's voucher at the counter and confirm its use before applying the benefit."
      />
      <RequireOrganization capacity="any">
        <RequirePermission
          anyOf={[
            PartnerRedemptionPermission.VOUCHER_VALIDATE,
            PartnerRedemptionPermission.VOUCHER_CONFIRM,
          ]}
          inOrganization
        >
          <RedeemCounter />
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
