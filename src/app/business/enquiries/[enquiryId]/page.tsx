import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BusinessPage } from "@/features/business-offers/components/business-portal";
import { SentEnquiry } from "@/features/business-offers/components/enquiries";
import { isUuid } from "@/shared/api";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";

export const metadata: Metadata = { title: "Sent enquiry" };

export default async function Page({ params }: { params: Promise<{ enquiryId: string }> }) {
  const { enquiryId } = await params;
  if (!isUuid(enquiryId)) notFound();
  return (
    <BusinessPage portal="merchant" permission={BusinessOfferPermission.SENT_ENQUIRY_VIEW}>
      <Suspense>
        <SentEnquiry enquiryId={enquiryId} />
      </Suspense>
    </BusinessPage>
  );
}
