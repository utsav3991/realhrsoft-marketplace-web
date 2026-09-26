import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { isUuid } from "@/shared/api";
import { IdentityPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

import { UserRecord } from "./user-record";

export const metadata: Metadata = { title: "User" };

export default async function AdminUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!isUuid(userId)) notFound();
  return (
    <RequirePermission anyOf={[IdentityPermission.USER_VIEW]}>
      <Suspense>
        <UserRecord userId={userId} />
      </Suspense>
    </RequirePermission>
  );
}
