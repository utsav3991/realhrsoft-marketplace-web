import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { RoleDetail } from "@/features/identity/components/role-detail";
import { isUuid } from "@/shared/api";
import { IdentityPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Role" };

export default async function AdminRolePage({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  if (!isUuid(roleId)) notFound();
  return (
    <RequirePermission anyOf={[IdentityPermission.ROLE_VIEW]}>
      <Suspense>
        <RoleDetail roleId={roleId} />
      </Suspense>
    </RequirePermission>
  );
}
