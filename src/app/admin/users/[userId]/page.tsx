import type { Metadata } from "next";

import { UserDetail } from "@/features/identity/components/user-detail";
import { IdentityPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "User" };

export default async function AdminUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return (
    <RequirePermission anyOf={[IdentityPermission.USER_VIEW]}>
      <UserDetail userId={userId} />
    </RequirePermission>
  );
}
