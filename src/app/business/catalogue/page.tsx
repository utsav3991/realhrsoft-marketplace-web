import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { BusinessPage } from "@/features/business-offers/components/business-portal";
import { BusinessCatalogue } from "@/features/business-offers/components/business-catalogue";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";

export const metadata: Metadata = { title: "Browse offers" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Browse offers"
        description="Offers other businesses make available to you. Enquire and the provider follows up."
      />
      <BusinessPage portal="merchant" permission={BusinessOfferPermission.CATALOGUE_VIEW}>
        <Suspense>
          <BusinessCatalogue />
        </Suspense>
      </BusinessPage>
    </div>
  );
}
