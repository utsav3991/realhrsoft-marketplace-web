import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { UsersDirectory } from "@/features/identity/components/users-directory";
import { IdentityPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Marketplace accounts and their current status." />
      <RequirePermission anyOf={[IdentityPermission.USER_VIEW]}>
        <Suspense>
          <UsersDirectory />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
