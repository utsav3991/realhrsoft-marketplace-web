import type { Metadata } from "next";

import { BusinessPage } from "@/features/business-offers/components/business-portal";
import { NewOwnBusinessOffer } from "@/features/business-offers/components/own-business-offers";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";

export const metadata: Metadata = { title: "New business offer" };

export default function Page() {
  return (
    <BusinessPage portal="merchant" permission={BusinessOfferPermission.OFFER_CREATE}>
      <NewOwnBusinessOffer />
    </BusinessPage>
  );
}
