import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { AdminEnquiries } from "@/features/business-offers/components/enquiries";
import { BusinessAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Business enquiries" };

export default function AdminBusinessEnquiriesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Business enquiries"
        description="Every organization's enquiries about business offers, open and closed. Providers follow them up and close them."
      />
      <RequirePermission anyOf={[BusinessAdminPermission.ENQUIRY_VIEW]}>
        <Suspense>
          <AdminEnquiries />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
