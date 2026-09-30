import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { BusinessOverview } from "@/features/business-offers/components/business-overview";
import { RequireOrganization } from "@/shared/navigation/organization-scope";

export const metadata: Metadata = { title: "Overview" };

export default function BusinessHomePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Business"
        description="Offers between organizations: sell your products or services to other businesses, and enquire about theirs."
      />
      <RequireOrganization capacity="business">
        <BusinessOverview />
      </RequireOrganization>
    </div>
  );
}
