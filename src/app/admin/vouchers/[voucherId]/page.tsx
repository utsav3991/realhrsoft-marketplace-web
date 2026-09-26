import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminVoucherRecord } from "@/features/redemptions/components/admin-vouchers";
import { isUuid } from "@/shared/api";
import { RedemptionAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Voucher" };

export default async function AdminVoucherRecordPage({
  params,
}: {
  params: Promise<{ voucherId: string }>;
}) {
  const { voucherId } = await params;
  if (!isUuid(voucherId)) notFound();
  return (
    <RequirePermission anyOf={[RedemptionAdminPermission.VOUCHER_VIEW]}>
      <AdminVoucherRecord voucherId={voucherId} />
    </RequirePermission>
  );
}
