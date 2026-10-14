import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { BusinessPage } from "@/features/business-offers/components/business-portal";
import { OwnBusinessOffers } from "@/features/business-offers/components/own-business-offers";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";

export const metadata: Metadata = { title: "Business offers" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Business offers"
        description="Offers you make to other businesses, and whether they can see them."
      />
      <BusinessPage portal="merchant" permission={BusinessOfferPermission.OFFER_VIEW}>
        <Suspense>
          <OwnBusinessOffers />
        </Suspense>
      </BusinessPage>
    </div>
  );
}
