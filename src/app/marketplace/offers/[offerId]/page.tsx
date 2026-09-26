import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogueOffer } from "@/features/claims/components/catalogue";
import { isUuid } from "@/shared/api";

export const metadata: Metadata = { title: "Offer" };

export default async function MarketplaceOfferPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  if (!isUuid(offerId)) notFound();
  return <CatalogueOffer offerId={offerId} />;
}
