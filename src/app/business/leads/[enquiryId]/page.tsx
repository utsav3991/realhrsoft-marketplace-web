import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Lead } from "@/features/business-offers/components/enquiries";
import { isUuid } from "@/shared/api";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Lead" };

export default async function Page({ params }: { params: Promise<{ enquiryId: string }> }) {
  const { enquiryId } = await params;
  if (!isUuid(enquiryId)) notFound();
  return (
    <RequireOrganization capacity="business">
      <RequirePermission anyOf={[BusinessOfferPermission.RECEIVED_ENQUIRY_VIEW]} inOrganization>
        <Suspense>
          <Lead enquiryId={enquiryId} />
        </Suspense>
      </RequirePermission>
    </RequireOrganization>
  );
}
