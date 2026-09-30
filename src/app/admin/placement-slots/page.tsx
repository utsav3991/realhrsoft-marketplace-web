import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { PlacementSlotsManager } from "@/features/marketing/components/placement-slots";
import { MarketingAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Placement slots" };

export default function AdminPlacementSlotsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Placement slots"
        description="Where advertisements may appear on the marketplace, and what fits in each place."
      />
      <RequirePermission anyOf={[MarketingAdminPermission.SLOT_VIEW]}>
        <Suspense>
          <PlacementSlotsManager />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
