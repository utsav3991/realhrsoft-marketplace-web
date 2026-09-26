import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { MyVouchers } from "@/features/redemptions/components/my-vouchers";

export const metadata: Metadata = { title: "My vouchers" };

export default function MyVouchersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My vouchers"
        description="Vouchers from your accepted claims. Open one to show its QR code at the counter."
      />
      <Suspense>
        <MyVouchers />
      </Suspense>
    </div>
  );
}
