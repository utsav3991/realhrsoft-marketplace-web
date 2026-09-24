import { Handshake, Store } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Button } from "@/design-system/primitives/button";

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
      <EmptyState
        icon={Handshake}
        title="Offer your products to the workforce"
        description="Businesses can apply to become verified marketplace Partners."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/partner/application">Apply to become a Partner</Link>
          </Button>
        }
      />
    </div>
  );
}
