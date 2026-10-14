import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { RealHRSoftSync } from "@/features/integrations/components/realhrsoft-sync";
import { IntegrationAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "RealHRSoft sync" };

export default function AdminRealHRSoftPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="RealHRSoft sync"
        description="RealHRSoft owns clients, companies and employees and pushes their changes here. Watch the synchronization's health, requeue stuck events and reconcile."
      />
      <RequirePermission anyOf={[IntegrationAdminPermission.SYNC_VIEW]}>
        <RealHRSoftSync />
      </RequirePermission>
    </div>
  );
}
