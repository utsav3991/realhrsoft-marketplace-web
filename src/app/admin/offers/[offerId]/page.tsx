import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OfferReview } from "@/features/offers/components/offer-moderation";
import { isUuid } from "@/shared/api";
import { OrganizationAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Review offer" };

export default async function AdminOfferPage({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  if (!isUuid(offerId)) notFound();
  return (
    <RequirePermission anyOf={[OrganizationAdminPermission.OFFER_REVIEW]}>
      <OfferReview offerId={offerId} />
    </RequirePermission>
  );
}
