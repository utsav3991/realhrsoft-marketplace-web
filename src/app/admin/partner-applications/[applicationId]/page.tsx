import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApplicationReview } from "@/features/organizations/components/application-review";
import { isUuid } from "@/shared/api";
import { OrganizationAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Partner application" };

export default async function AdminPartnerApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  if (!isUuid(applicationId)) notFound();
  return (
    <RequirePermission anyOf={[OrganizationAdminPermission.APPLICATION_VIEW]}>
      <ApplicationReview applicationId={applicationId} />
    </RequirePermission>
  );
}
