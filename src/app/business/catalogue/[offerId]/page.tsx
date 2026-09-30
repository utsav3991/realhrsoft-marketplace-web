import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BusinessCatalogueOffer } from "@/features/business-offers/components/business-catalogue";
import { isUuid } from "@/shared/api";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Business offer" };

export default async function Page({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  if (!isUuid(offerId)) notFound();
  return (
    <RequireOrganization capacity="business">
      <RequirePermission anyOf={[BusinessOfferPermission.CATALOGUE_VIEW]} inOrganization>
        <Suspense>
          <BusinessCatalogueOffer offerId={offerId} />
        </Suspense>
      </RequirePermission>
    </RequireOrganization>
  );
}
