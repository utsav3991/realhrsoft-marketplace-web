import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { BusinessPage } from "@/features/business-offers/components/business-portal";
import { Leads } from "@/features/business-offers/components/enquiries";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";

export const metadata: Metadata = { title: "Leads" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Enquiries other businesses sent about your business offers. Follow up with the contact, then close them."
      />
      <BusinessPage portal="merchant" permission={BusinessOfferPermission.RECEIVED_ENQUIRY_VIEW}>
        <Suspense>
          <Leads />
        </Suspense>
      </BusinessPage>
    </div>
  );
}
