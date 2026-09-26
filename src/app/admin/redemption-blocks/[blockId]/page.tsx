import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RedemptionBlockRecord } from "@/features/redemptions/components/redemption-blocks";
import { isUuid } from "@/shared/api";
import { RedemptionAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Redemption block" };

export default async function RedemptionBlockRecordPage({
  params,
}: {
  params: Promise<{ blockId: string }>;
}) {
  const { blockId } = await params;
  if (!isUuid(blockId)) notFound();
  return (
    <RequirePermission anyOf={[RedemptionAdminPermission.BLOCK_VIEW]}>
      <RedemptionBlockRecord blockId={blockId} />
    </RequirePermission>
  );
}
