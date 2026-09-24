import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { AssistedApplicationForm } from "@/features/organizations/components/assisted-application-form";
import { OrganizationAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Assisted application" };

export default function AssistedApplicationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Assisted application"
        description="Submit a Partner application on behalf of an existing account."
      />
      <RequirePermission anyOf={[OrganizationAdminPermission.APPLICATION_CREATE]}>
        <AssistedApplicationForm />
      </RequirePermission>
    </div>
  );
}
