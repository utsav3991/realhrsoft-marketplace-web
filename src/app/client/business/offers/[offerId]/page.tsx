import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BusinessPage } from "@/features/business-offers/components/business-portal";
import { OwnBusinessOffer } from "@/features/business-offers/components/own-business-offers";
import { isUuid } from "@/shared/api";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";

export const metadata: Metadata = { title: "Business offer" };

export default async function Page({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  if (!isUuid(offerId)) notFound();
  return (
    <BusinessPage portal="client" permission={BusinessOfferPermission.OFFER_VIEW}>
      <Suspense>
        <OwnBusinessOffer offerId={offerId} />
      </Suspense>
    </BusinessPage>
  );
}
