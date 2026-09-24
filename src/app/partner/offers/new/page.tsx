import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { NewOffer } from "@/features/offers/components/partner-offers";
import { PartnerPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "New offer" };

export default function NewOfferPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New offer" />
      <RequireOrganization capacity="partner">
        <RequirePermission inOrganization anyOf={[PartnerPermission.OFFER_CREATE]}>
          <NewOffer />
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
