import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { RolesList } from "@/features/identity/components/roles-list";
import { IdentityPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

import { NewRoleAction } from "./new-role-action";

export const metadata: Metadata = { title: "Roles" };

export default function AdminRolesPage() {
  return (
    <RequirePermission anyOf={[IdentityPermission.ROLE_VIEW]}>
      <div className="space-y-6">
        <PageHeader
          title="Roles"
          description="Named bundles of permissions, granted to users platform-wide."
          actions={<NewRoleAction />}
        />
        <Suspense>
          <RolesList />
        </Suspense>
      </div>
    </RequirePermission>
  );
}
