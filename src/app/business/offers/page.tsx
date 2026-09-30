import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { OwnBusinessOffers } from "@/features/business-offers/components/own-business-offers";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Business offers" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Business offers"
        description="Offers your organization makes to other organizations, and whether they can see them."
      />
      <RequireOrganization capacity="business">
        <RequirePermission anyOf={[BusinessOfferPermission.OFFER_VIEW]} inOrganization>
          <Suspense>
            <OwnBusinessOffers />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
