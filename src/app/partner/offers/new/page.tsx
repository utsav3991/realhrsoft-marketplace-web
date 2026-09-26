import type { Metadata } from "next";

import { NewOwnOffer } from "@/features/offers/components/own-offers";
import { PartnerOfferPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "New offer" };

export default function PartnerNewOfferPage() {
  return (
    <RequireOrganization capacity="any">
      <RequirePermission anyOf={[PartnerOfferPermission.OFFER_CREATE]} inOrganization>
        <NewOwnOffer />
      </RequirePermission>
    </RequireOrganization>
  );
}
