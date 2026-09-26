import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MyBenefit } from "@/features/employer-benefits/components/my-benefits";
import { isUuid } from "@/shared/api";

export const metadata: Metadata = { title: "Company benefit" };

export default async function MyCompanyBenefitPage({
  params,
}: {
  params: Promise<{ benefitId: string }>;
}) {
  const { benefitId } = await params;
  if (!isUuid(benefitId)) notFound();
  return (
    <Suspense>
      <MyBenefit benefitId={benefitId} />
    </Suspense>
  );
}
