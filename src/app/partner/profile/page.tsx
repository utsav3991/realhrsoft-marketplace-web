import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { OwnPartnerProfile } from "@/features/partners/components/own-partner";
import { PartnerPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

import { PartnerOnboarding } from "../partner-dashboard";

export const metadata: Metadata = { title: "Profile" };

export default function PartnerProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Partner profile" />
      <RequireOrganization capacity="partner" empty={<PartnerOnboarding />}>
        <RequirePermission inOrganization anyOf={[PartnerPermission.PROFILE_VIEW]}>
          <OwnPartnerProfile />
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
