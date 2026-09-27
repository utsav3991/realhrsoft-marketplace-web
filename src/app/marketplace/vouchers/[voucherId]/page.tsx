import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OpenVoucher } from "@/features/redemptions/components/my-vouchers";
import { isUuid } from "@/shared/api";

export const metadata: Metadata = { title: "Voucher" };

export default async function VoucherPage({ params }: { params: Promise<{ voucherId: string }> }) {
  const { voucherId } = await params;
  if (!isUuid(voucherId)) notFound();
  return <OpenVoucher voucherId={voucherId} />;
}
