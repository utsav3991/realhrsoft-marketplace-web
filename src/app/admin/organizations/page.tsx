import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { OrganizationsDirectory } from "@/features/organizations/components/organizations-directory";
import { OrganizationAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Organizations" };

export default function AdminOrganizationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Organization identities and their verified portal members."
      />
      <RequirePermission anyOf={[OrganizationAdminPermission.ORGANIZATION_VIEW]}>
        <Suspense>
          <OrganizationsDirectory />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
