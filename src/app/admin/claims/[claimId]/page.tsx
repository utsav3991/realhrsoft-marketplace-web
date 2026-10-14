import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminClaim } from "@/features/claims/components/admin-claims";
import { isUuid } from "@/shared/api";
import { ClaimAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Claim" };

export default async function AdminClaimPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = await params;
  if (!isUuid(claimId)) notFound();
  return (
    <RequirePermission anyOf={[ClaimAdminPermission.CLAIM_VIEW]}>
      <AdminClaim claimId={claimId} />
    </RequirePermission>
  );
}
