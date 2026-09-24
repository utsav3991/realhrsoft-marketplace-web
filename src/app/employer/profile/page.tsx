import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { EmployerProfile } from "@/features/organizations/components/employer-profile";
import { EmployerPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Profile" };

export default function EmployerProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Employer profile" />
      <RequireOrganization capacity="employer">
        <RequirePermission inOrganization anyOf={[EmployerPermission.PROFILE_VIEW]}>
          <EmployerProfile />
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
