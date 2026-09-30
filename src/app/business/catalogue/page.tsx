import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/design-system/components/page-header";
import { BusinessCatalogue } from "@/features/business-offers/components/business-catalogue";
import { BusinessOfferPermission } from "@/shared/authorization/permission-codes";
import { RequireOrganization } from "@/shared/navigation/organization-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Browse offers" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Browse offers"
        description="Offers other businesses make available to your organization. Enquire and the provider follows up."
      />
      <RequireOrganization capacity="business">
        <RequirePermission anyOf={[BusinessOfferPermission.CATALOGUE_VIEW]} inOrganization>
          <Suspense>
            <BusinessCatalogue />
          </Suspense>
        </RequirePermission>
      </RequireOrganization>
    </div>
  );
}
