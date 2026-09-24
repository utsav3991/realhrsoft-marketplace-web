import { PageHeader } from "@/design-system/components/page-header";
import { RequireOrganization } from "@/shared/navigation/organization-scope";

import { PartnerDashboard, PartnerOnboarding } from "./partner-dashboard";

export default function PartnerDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner dashboard"
        description="Your offers and commercial status in the marketplace."
      />
      <RequireOrganization capacity="partner" empty={<PartnerOnboarding />}>
        <PartnerDashboard />
      </RequireOrganization>
    </div>
  );
}
