import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { BusinessOverview } from "@/features/business-offers/components/business-overview";
import { BusinessPage } from "@/features/business-offers/components/business-portal";

export const metadata: Metadata = { title: "Overview" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Business"
        description="Offers between businesses: sell your products or services to other businesses, and enquire about theirs."
      />
      <BusinessPage portal="merchant">
        <BusinessOverview />
      </BusinessPage>
    </div>
  );
}
