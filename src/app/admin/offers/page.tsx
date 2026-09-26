import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { OffersDirectory } from "@/features/offers/components/offers-directory";
import { OfferAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Offers" };

export default function AdminOffersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Offers"
        description="The content review queue and every partner's offers, whatever their status."
      />
      <RequirePermission anyOf={[OfferAdminPermission.OFFER_VIEW]}>
        <Suspense>
          <OffersDirectory />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
