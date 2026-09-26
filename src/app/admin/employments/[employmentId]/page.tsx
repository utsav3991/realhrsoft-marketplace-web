import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmploymentRecord } from "@/features/employments/components/employments";
import { isUuid } from "@/shared/api";
import { EmploymentAdminPermission } from "@/shared/authorization/permission-codes";
import { RequirePermission } from "@/shared/navigation/portal-gate";

export const metadata: Metadata = { title: "Employment" };

export default async function AdminEmploymentPage({
  params,
}: {
  params: Promise<{ employmentId: string }>;
}) {
  const { employmentId } = await params;
  if (!isUuid(employmentId)) notFound();
  return (
    <RequirePermission anyOf={[EmploymentAdminPermission.EMPLOYMENT_VIEW]}>
      <EmploymentRecord employmentId={employmentId} />
    </RequirePermission>
  );
}
