import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminReceiptRecord } from "@/features/redemptions/components/admin-receipts";
import { isUuid } from "@/shared/api";
import { RedemptionAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Receipt" };

export default async function AdminReceiptRecordPage({
  params,
}: {
  params: Promise<{ redemptionId: string }>;
}) {
  const { redemptionId } = await params;
  if (!isUuid(redemptionId)) notFound();
  return (
    <RequirePermission anyOf={[RedemptionAdminPermission.REDEMPTION_VIEW]}>
      <AdminReceiptRecord receiptId={redemptionId} />
    </RequirePermission>
  );
}
