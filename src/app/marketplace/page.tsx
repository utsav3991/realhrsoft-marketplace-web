import { Store } from "lucide-react";

import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";

export default function MarketplaceHomePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Discover offers"
        description="Exclusive offers from marketplace partners, and benefits from your employer."
      />
      <EmptyState
        icon={Store}
        title="No offers yet"
        description="Offers will appear here once the marketplace catalogue API is available."
      />
    </div>
  );
}
