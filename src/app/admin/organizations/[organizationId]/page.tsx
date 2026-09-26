import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OrganizationDetail } from "@/features/organizations/components/organization-detail";
import { isUuid } from "@/shared/api";
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
      <Suspense>
        <OrganizationDetail organizationId={organizationId} />
      </Suspense>
    </RequirePermission>
  );
}
