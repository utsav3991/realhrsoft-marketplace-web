import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { Catalogue } from "@/features/claims/components/catalogue";

export default function MarketplaceHomePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Discover offers"
        description="Exclusive offers from marketplace partners, available through your employer."
      />
      <Suspense>
        <Catalogue />
      </Suspense>
    </div>
  );
}
