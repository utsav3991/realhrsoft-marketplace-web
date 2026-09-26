import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { CategoriesManager } from "@/features/offers/components/categories-manager";
import { OfferAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Offer categories" };

export default function AdminOfferCategoriesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Offer categories"
        description="How offers are grouped in the catalogue. Retired categories keep their offers."
      />
      <RequirePermission anyOf={[OfferAdminPermission.CATEGORY_VIEW]}>
        <Suspense>
          <CategoriesManager />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
