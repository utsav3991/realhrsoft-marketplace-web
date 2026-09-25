import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PartnerRecord } from "@/features/partners/components/partner-record";
import { isUuid } from "@/shared/api";
import { PartnerAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Partner" };

export default async function AdminPartnerPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  if (!isUuid(partnerId)) notFound();
  return (
    <RequirePermission anyOf={[PartnerAdminPermission.PARTNER_VIEW]}>
      <PartnerRecord partnerId={partnerId} />
    </RequirePermission>
  );
}
