import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PartnerClaimRecord } from "@/features/claims/components/partner-claims";
import { isUuid } from "@/shared/api";
import { PartnerClaimPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Claim" };

export default async function PartnerClaimPage({
  params,
}: {
  params: Promise<{ claimId: string }>;
}) {
  const { claimId } = await params;
  if (!isUuid(claimId)) notFound();
  return (
    <RequireOrganization capacity="any">
      <RequirePermission anyOf={[PartnerClaimPermission.CLAIM_VIEW]} inOrganization>
        <PartnerClaimRecord claimId={claimId} />
      </RequirePermission>
    </RequireOrganization>
  );
}
