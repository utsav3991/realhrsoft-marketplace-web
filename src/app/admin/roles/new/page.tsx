import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { CreateRoleForm } from "@/features/identity/components/create-role-form";
import { IdentityPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "New role" };

export default function AdminNewRolePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New role" description="Define a role, then grant it to users." />
      <RequirePermission anyOf={[IdentityPermission.ROLE_CREATE]}>
        <CreateRoleForm />
      </RequirePermission>
    </div>
  );
}
