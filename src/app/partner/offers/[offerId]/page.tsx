import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PartnerOfferDetail } from "@/features/offers/components/partner-offer-detail";
import { isUuid } from "@/shared/api";
import { PartnerPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Offer" };

export default async function PartnerOfferPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  if (!isUuid(offerId)) notFound();
  return (
    <RequireOrganization capacity="partner">
      <RequirePermission inOrganization anyOf={[PartnerPermission.OFFER_VIEW]}>
        <PartnerOfferDetail offerId={offerId} />
      </RequirePermission>
    </RequireOrganization>
  );
}
