"use client";

import { useSelectedOrganizationId } from "@/shared/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { Detail, DetailList } from "@/shared/components/details";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";

import { useEmployerProfile } from "../api/queries";

export function EmployerProfile() {
  const organizationId = useSelectedOrganizationId();
  const profile = useEmployerProfile(organizationId);
  if (profile.isPending) return <Skeleton className="h-40 w-full" />;
  if (profile.isError) {
    return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{profile.data.organization_name}</CardTitle>
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Employer profile">
            <StatusBadge domain="employerProfile" status={profile.data.status} />
          </Detail>
          <Detail label="Enabled">{formatDateTime(profile.data.enabled_at)}</Detail>
          <Detail label="Benefit audience">Your organization&apos;s own employees only</Detail>
        </DetailList>
      </CardContent>
    </Card>
  );
}
