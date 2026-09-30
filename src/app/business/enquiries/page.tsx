import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { SentEnquiries } from "@/features/business-offers/components/enquiries";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Sent enquiries" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sent enquiries"
        description="Your organization's enquiries about other businesses' offers, and how they were closed."
      />
      <RequireOrganization capacity="business">
        <RequirePermission anyOf={[BusinessOfferPermission.SENT_ENQUIRY_VIEW]} inOrganization>
          <Suspense>
            <SentEnquiries />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
