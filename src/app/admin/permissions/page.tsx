import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { PermissionsCatalogue } from "@/features/identity/components/permissions-catalogue";
import { IdentityPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Permissions" };

export default function AdminPermissionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions"
        description="Every permission the platform enforces. Roles bundle these codes."
      />
      <RequirePermission anyOf={[IdentityPermission.PERMISSION_VIEW]}>
        <PermissionsCatalogue />
      </RequirePermission>
    </div>
  );
}
