import type { Metadata } from "next";
import { Suspense } from "react";

import { NewAdminBusinessOffer } from "@/features/business-offers/components/admin-business-offers";
import { OfferAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Post business offer" };

export default function AdminNewBusinessOfferPage() {
  return (
    <RequirePermission anyOf={[OfferAdminPermission.OFFER_CREATE]}>
      <Suspense>
        <NewAdminBusinessOffer />
      </Suspense>
    </RequirePermission>
  );
}
