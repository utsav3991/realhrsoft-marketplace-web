import type { Metadata } from "next";
import { Suspense } from "react";

import { NewOffer } from "@/features/offers/components/new-offer";
import { OfferAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Post offer" };

export default function AdminNewOfferPage() {
  return (
    <RequirePermission anyOf={[OfferAdminPermission.OFFER_CREATE]}>
      <Suspense>
        <NewOffer />
      </Suspense>
    </RequirePermission>
  );
}
