import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { MyClaims } from "@/features/claims/components/my-claims";

export const metadata: Metadata = { title: "My offers" };

export default function MyClaimsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My offers"
        description="Offers you requested or claimed, their approval and the vouchers issued for them."
      />
      <Suspense>
        <MyClaims />
      </Suspense>
    </div>
  );
}
