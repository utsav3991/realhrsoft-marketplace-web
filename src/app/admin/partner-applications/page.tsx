import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { Button } from "@/design-system/primitives/button";
import { ApplicationsQueue } from "@/features/organizations/components/applications-queue";
import { Can } from "@/shared/authorization/can";
import { OrganizationAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Partner applications" };

export default function AdminPartnerApplicationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner applications"
        description="Verify businesses before they can publish offers. Verification grants no permissions by itself."
        actions={
          <Can permission={OrganizationAdminPermission.APPLICATION_CREATE}>
            <Button asChild variant="outline">
              <Link href="/admin/partner-applications/new">
                <Plus aria-hidden />
                Assisted application
              </Link>
            </Button>
          </Can>
        }
      />
      <RequirePermission anyOf={[OrganizationAdminPermission.APPLICATION_VIEW]}>
        <Suspense>
          <ApplicationsQueue />
        </Suspense>
      </RequirePermission>
    </div>
  );
}
