import type { Metadata } from "next";

import { PageHeader } from "@/design-system/components/page-header";
import { ClientCompanies } from "@/features/clients/components/company-users";
import { ClientAdministrationPermission } from "@/shared/authorization/permission-codes";
import { RequireClient } from "@/shared/navigation/client-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Companies" };

export default function ClientCompaniesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Your group's companies, as RealHRSoft synchronizes them. Open one to manage the users who work in its employer portal."
      />
      <RequireClient>
        <RequirePermission anyOf={[ClientAdministrationPermission.COMPANY_USER_MANAGE]} inClient>
          <ClientCompanies />
        </RequirePermission>
      </RequireClient>
    </div>
  );
}
