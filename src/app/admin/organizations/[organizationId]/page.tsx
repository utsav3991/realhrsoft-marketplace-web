import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EntitlementCard } from "@/features/commercial/components/entitlement-card";
import { OrganizationDetail } from "@/features/organizations/components/organization-detail";
import { isUuid } from "@/shared/api";
import { Can } from "@/shared/authorization/can";
import { OrganizationAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Organization" };

export default async function AdminOrganizationPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  if (!isUuid(organizationId)) notFound();
  return (
    <RequirePermission anyOf={[OrganizationAdminPermission.ORGANIZATION_VIEW]}>
      <OrganizationDetail organizationId={organizationId}>
        {/* Reading the entitlement needs commercial authority; it shows only for Partners. */}
        <Can permission={OrganizationAdminPermission.ENTITLEMENT_MANAGE}>
          <EntitlementCard organizationId={organizationId} />
        </Can>
      </OrganizationDetail>
    </RequirePermission>
  );
}
