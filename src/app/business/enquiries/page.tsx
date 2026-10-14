import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { BusinessPage } from "@/features/business-offers/components/business-portal";
import { SentEnquiries } from "@/features/business-offers/components/enquiries";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";

export const metadata: Metadata = { title: "Sent enquiries" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sent enquiries"
        description="Your enquiries about other businesses' offers, and how they were closed."
      />
      <BusinessPage portal="merchant" permission={BusinessOfferPermission.SENT_ENQUIRY_VIEW}>
        <Suspense>
          <SentEnquiries />
        </Suspense>
      </BusinessPage>
    </div>
  );
}
