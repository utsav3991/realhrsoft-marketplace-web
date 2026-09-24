import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { OfferReviewQueue } from "@/features/offers/components/offer-moderation";
import { OrganizationAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Offer review" };

export default function AdminOffersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Offer review"
        description="Content moderation. Approval covers content only; verification and commercial eligibility are separate gates."
      />
      <RequirePermission anyOf={[OrganizationAdminPermission.OFFER_REVIEW]}>
        <Suspense>
          <OfferReviewQueue />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
