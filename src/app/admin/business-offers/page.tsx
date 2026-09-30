import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { AdminBusinessOffers } from "@/features/business-offers/components/admin-business-offers";
import { OfferAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Business offers" };

export default function AdminBusinessOffersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Business offers"
        description="Offers organizations make to other organizations: the review queue and every business offer, whatever its status."
      />
      <RequirePermission anyOf={[OfferAdminPermission.OFFER_VIEW]}>
        <Suspense>
          <AdminBusinessOffers />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
