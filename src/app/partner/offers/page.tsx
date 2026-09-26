import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { OwnOffers } from "@/features/offers/components/own-offers";
import { PartnerOfferPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Offers" };

export default function PartnerOffersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Offers"
        description="Your offers, their review status and whether employees can see them."
      />
      <RequireOrganization capacity="any">
        <RequirePermission anyOf={[PartnerOfferPermission.OFFER_VIEW]} inOrganization>
          <Suspense>
            <OwnOffers />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
