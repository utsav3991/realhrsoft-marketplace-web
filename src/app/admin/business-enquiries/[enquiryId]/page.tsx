import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminEnquiry } from "@/features/business-offers/components/enquiries";
import { isUuid } from "@/shared/api";
import { BusinessAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Business enquiry" };

export default async function AdminBusinessEnquiryPage({
  params,
}: {
  params: Promise<{ enquiryId: string }>;
}) {
  const { enquiryId } = await params;
  if (!isUuid(enquiryId)) notFound();
  return (
    <RequirePermission anyOf={[BusinessAdminPermission.ENQUIRY_VIEW]}>
      <Suspense>
        <AdminEnquiry enquiryId={enquiryId} />
      </Suspense>
    </RequirePermission>
  );
}
