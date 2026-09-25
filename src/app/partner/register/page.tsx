import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { OwnPartnerRegistration } from "@/features/partners/components/own-partner";
import { PartnerPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Register as a partner" };

export default function PartnerRegisterPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Register as a partner"
        description="Tell Aayulogic about your business. Verification comes before any offer is published."
      />
      <RequireOrganization capacity="any">
        <RequirePermission anyOf={[PartnerPermission.PROFILE_CREATE]} inOrganization>
          <OwnPartnerRegistration />
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
