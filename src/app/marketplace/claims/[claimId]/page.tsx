import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MyClaim } from "@/features/claims/components/my-claims";
import { isUuid } from "@/shared/api";

export const metadata: Metadata = { title: "Claimed offer" };

export default async function MyClaimPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = await params;
  if (!isUuid(claimId)) notFound();
  return <MyClaim claimId={claimId} />;
}
