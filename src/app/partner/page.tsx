import { PageHeader } from "@/design-system/components/page-header";
import { SLOTS, SponsoredBanner } from "@/features/marketing/components/sponsored-placement";
import { PartnerDashboard } from "@/features/partners/components/own-partner";
import { RequireOrganization } from "@/shared/navigation/organization-scope";

export default function PartnerDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner dashboard"
        description="Your organization's partner registration and verification."
      />
      <SponsoredBanner slotKey={SLOTS.appHomeTop} />
      <RequireOrganization capacity="any">
        <PartnerDashboard />
      </RequireOrganization>
    </div>
  );
}
