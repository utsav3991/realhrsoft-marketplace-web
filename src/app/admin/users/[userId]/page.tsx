import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UserDetail } from "@/features/identity/components/user-detail";
import { isUuid } from "@/shared/api";
import { IdentityPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "User" };

export default async function AdminUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!isUuid(userId)) notFound();
  return (
    <RequirePermission anyOf={[IdentityPermission.USER_VIEW]}>
      <UserDetail userId={userId} />
    </RequirePermission>
  );
}
