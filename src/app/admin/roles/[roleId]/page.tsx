import type { Metadata } from "next";

import { RoleDetail } from "@/features/identity/components/role-detail";
import { IdentityPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Role" };

export default async function AdminRolePage({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  return (
    <RequirePermission anyOf={[IdentityPermission.ROLE_VIEW]}>
      <RoleDetail roleId={roleId} />
    </RequirePermission>
  );
}
