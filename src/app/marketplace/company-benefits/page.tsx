import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { MyBenefits } from "@/features/employer-benefits/components/my-benefits";

export const metadata: Metadata = { title: "Company benefits" };

export default function MyCompanyBenefitsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Company benefits"
        description="Benefits your employer offers you directly. They are separate from marketplace offers."
      />
      <Suspense>
        <MyBenefits />
      </Suspense>
    </div>
  );
}
