import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { PartnerOffers } from "@/features/offers/components/partner-offers";
import { PartnerPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

import { PartnerOnboarding } from "../partner-dashboard";

export const metadata: Metadata = { title: "Offers" };

export default function PartnerOffersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Offers"
        description="An offer is live only when your business is verified, commercially eligible and the content is approved."
      />
      <RequireOrganization capacity="partner" empty={<PartnerOnboarding />}>
        <RequirePermission inOrganization anyOf={[PartnerPermission.OFFER_VIEW]}>
          <Suspense>
            <PartnerOffers />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
