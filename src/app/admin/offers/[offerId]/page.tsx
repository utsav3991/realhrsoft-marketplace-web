import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OfferRecord } from "@/features/offers/components/offer-record";
import { isUuid } from "@/shared/api";
import { OfferAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Offer" };

export default async function AdminOfferPage({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  if (!isUuid(offerId)) notFound();
  return (
    <RequirePermission anyOf={[OfferAdminPermission.OFFER_VIEW]}>
      <Suspense>
        <OfferRecord offerId={offerId} />
      </Suspense>
    </RequirePermission>
  );
}
