import { Handshake } from "lucide-react";

import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";

export default function PartnerDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Partner dashboard"
        description="Offers, advertising, campaigns and billing."
      />
      <EmptyState icon={Handshake} title="Nothing here yet" />
    </div>
  );
}
