import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { BusinessOverview } from "@/features/business-offers/components/business-overview";
import { BusinessPage } from "@/features/business-offers/components/business-portal";

export const metadata: Metadata = { title: "Business" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Business"
        description="Your client group as a business: offer to merchants and other client groups, and enquire about their offers. Your offers are enquiry-only."
      />
      <BusinessPage portal="client">
        <BusinessOverview />
      </BusinessPage>
    </div>
  );
}
