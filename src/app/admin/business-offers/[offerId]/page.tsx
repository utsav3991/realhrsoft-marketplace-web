import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminBusinessOffer } from "@/features/business-offers/components/admin-business-offers";
import { isUuid } from "@/shared/api";
import { OfferAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Business offer" };

export default async function AdminBusinessOfferPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  if (!isUuid(offerId)) notFound();
  return (
    <RequirePermission anyOf={[OfferAdminPermission.OFFER_VIEW]}>
      <Suspense>
        <AdminBusinessOffer offerId={offerId} />
      </Suspense>
    </RequirePermission>
  );
}
