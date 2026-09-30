import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isSlotKey } from "@/features/marketing/api/slot-key";
import { ServedAdPage } from "@/features/marketing/components/ad-page";
import { isUuid } from "@/shared/api";

export const metadata: Metadata = { title: "Sponsored" };

export default async function MarketplaceAdPage({
  params,
  searchParams,
}: {
  params: Promise<{ adId: string }>;
  searchParams: Promise<{ slot?: string | string[]; revision?: string | string[] }>;
}) {
  const [{ adId }, { slot, revision }] = await Promise.all([params, searchParams]);
  // The click link carries the slot and revision served; without them the page cannot load.
  if (
    !isUuid(adId) ||
    typeof slot !== "string" ||
    !isSlotKey(slot) ||
    typeof revision !== "string" ||
    !isUuid(revision)
  ) {
    notFound();
  }
  return <ServedAdPage adId={adId} slotKey={slot} revisionId={revision} />;
}
