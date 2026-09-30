import type { Metadata } from "next";

import { NewOwnBusinessOffer } from "@/features/business-offers/components/own-business-offers";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "New business offer" };

export default function Page() {
  return (
    <RequireOrganization capacity="business">
      <RequirePermission anyOf={[BusinessOfferPermission.OFFER_CREATE]} inOrganization>
        <NewOwnBusinessOffer />
      </RequirePermission>
    </RequireOrganization>
  );
}
