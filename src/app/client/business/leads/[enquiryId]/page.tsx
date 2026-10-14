import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BusinessPage } from "@/features/business-offers/components/business-portal";
import { Lead } from "@/features/business-offers/components/enquiries";
import { isUuid } from "@/shared/api";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";

export const metadata: Metadata = { title: "Lead" };

export default async function Page({ params }: { params: Promise<{ enquiryId: string }> }) {
  const { enquiryId } = await params;
  if (!isUuid(enquiryId)) notFound();
  return (
    <BusinessPage portal="client" permission={BusinessOfferPermission.RECEIVED_ENQUIRY_VIEW}>
      <Suspense>
        <Lead enquiryId={enquiryId} />
      </Suspense>
    </BusinessPage>
  );
}
