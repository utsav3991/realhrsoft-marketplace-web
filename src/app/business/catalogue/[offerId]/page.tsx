import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BusinessPage } from "@/features/business-offers/components/business-portal";
import { BusinessCatalogueOffer } from "@/features/business-offers/components/business-catalogue";
import { isUuid } from "@/shared/api";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";

export const metadata: Metadata = { title: "Business offer" };

export default async function Page({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  if (!isUuid(offerId)) notFound();
  return (
    <BusinessPage portal="merchant" permission={BusinessOfferPermission.CATALOGUE_VIEW}>
      <Suspense>
        <BusinessCatalogueOffer offerId={offerId} />
      </Suspense>
    </BusinessPage>
  );
}
