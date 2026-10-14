import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { ClientMembers } from "@/features/clients/components/client-members";
import { ClientAdministrationPermission } from "@/shared/authorization/permission-codes";
import { RequireClient } from "@/shared/navigation/client-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Members and roles" };

export default function ClientMembersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Members and roles"
        description="Who acts for your group and with which client roles. A client role applies in the client and in every one of its companies, including ones added later."
      />
      <RequireClient>
        <RequirePermission
          anyOf={[
            ClientAdministrationPermission.MEMBER_MANAGE,
            ClientAdministrationPermission.ROLE_MANAGE,
          ]}
          inClient
        >
          <Suspense>
            <ClientMembers />
          </Suspense>
        </RequirePermission>
      </RequireClient>
    </div>
  );
}
