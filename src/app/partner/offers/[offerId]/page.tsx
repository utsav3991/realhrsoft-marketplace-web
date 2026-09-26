import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OwnOffer } from "@/features/offers/components/own-offers";
import { isUuid } from "@/shared/api";
import { PartnerOfferPermission } from "@/shared/authorization/permission-codes";
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
    <RequireOrganization capacity="any">
      <RequirePermission anyOf={[PartnerOfferPermission.OFFER_VIEW]} inOrganization>
        <Suspense>
          <OwnOffer offerId={offerId} />
        </Suspense>
      </RequirePermission>
    </RequireOrganization>
  );
}
