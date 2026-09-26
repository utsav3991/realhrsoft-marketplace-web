import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PartnerReceiptRecord } from "@/features/redemptions/components/partner-receipts";
import { isUuid } from "@/shared/api";
import { PartnerRedemptionPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Receipt" };

export default async function PartnerReceiptPage({
  params,
}: {
  params: Promise<{ redemptionId: string }>;
}) {
  const { redemptionId } = await params;
  if (!isUuid(redemptionId)) notFound();
  return (
    <RequireOrganization capacity="any">
      <RequirePermission anyOf={[PartnerRedemptionPermission.REDEMPTION_VIEW]} inOrganization>
        <PartnerReceiptRecord receiptId={redemptionId} />
      </RequirePermission>
    </RequireOrganization>
  );
}
