import { PageHeader } from "@/design-system/components/page-header";
import { SLOTS, SponsoredBanner } from "@/features/marketing/components/sponsored-placement";

import { AdminOverview } from "./admin-overview";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Platform administration for the marketplace." />
      <SponsoredBanner slotKey={SLOTS.appHomeTop} />
      <AdminOverview />
    </div>
  );
}
