import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { Leads } from "@/features/business-offers/components/enquiries";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Leads" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Enquiries other organizations sent about your business offers. Follow up with the contact, then close them."
      />
      <RequireOrganization capacity="business">
        <RequirePermission anyOf={[BusinessOfferPermission.RECEIVED_ENQUIRY_VIEW]} inOrganization>
          <Suspense>
            <Leads />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
