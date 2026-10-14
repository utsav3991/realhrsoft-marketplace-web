import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CompanyUsersPanel } from "@/features/clients/components/company-users";
import { isUuid } from "@/shared/api";
import { ClientAdministrationPermission } from "@/shared/authorization/permission-codes";
import { RequireClient } from "@/shared/navigation/client-scope";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Company users" };

export default async function CompanyUsersPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  if (!isUuid(companyId)) notFound();
  return (
    <RequireClient>
      <RequirePermission anyOf={[ClientAdministrationPermission.COMPANY_USER_MANAGE]} inClient>
        <CompanyUsersPanel companyId={companyId} />
      </RequirePermission>
    </RequireClient>
  );
}
