"use client";

import { ArrowLeft, Building2, Gift, Handshake, Pencil, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError, type Schemas } from "@/shared/api";
import {
  BenefitAdminPermission,
  IdentityPermission,
  OrganizationAdminPermission,
  PartnerAdminPermission,
  useCan,
} from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { FieldsDialog } from "@/shared/components/fields-dialog";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { QueryDataTable } from "@/shared/components/query-data-table";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";

import {
  useEndMembership,
  useSetEmployerCapacity,
  useUpdateOrganization,
  useVerifyMembership,
} from "../api/mutations";
import { MEMBERSHIP_SORTS, useMemberships, useOrganization } from "../api/queries";

type Organization = Schemas["Organization"];
type Membership = Schemas["PortalMembership"];

const MEMBER_FIELD = [
  {
    name: "user_id",
    label: "User ID",
    kind: "uuid",
    hint: "An existing active user; copy the ID from the user's page.",
  },
] as const;

function BackToOrganizations() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/admin/organizations">
        <ArrowLeft aria-hidden />
        Organizations
      </Link>
    </Button>
  );
}

export function OrganizationDetail({ organizationId }: { organizationId: string }) {
  const organization = useOrganization(organizationId);

  if (organization.isPending) {
    return (
      <div className="space-y-6">
        <BackToOrganizations />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (organization.isError) {
    return (
      <div className="space-y-6">
        <BackToOrganizations />
        {organization.error instanceof ApiError && organization.error.isNotFound ? (
          <EmptyState title="Organization not found" />
        ) : (
          <ErrorState error={organization.error} onRetry={() => void organization.refetch()} />
        )}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <BackToOrganizations />
      <PageHeader title={organization.data.name} />
      <IdentityCard organization={organization.data} />
      <EmployerCard organization={organization.data} />
      <MembershipsCard organizationId={organizationId} />
    </div>
  );
}

function IdentityCard({ organization }: { organization: Organization }) {
  const [renaming, setRenaming] = useState(false);
  const update = useUpdateOrganization(organization.id);
  const canManage = useCan(OrganizationAdminPermission.ORGANIZATION_MANAGE);
  const canRegisterPartner = useCan(PartnerAdminPermission.PARTNER_CREATE);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            Identity only. A partner registration and the Employer capacity are separate and
            independent.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRegisterPartner ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/partners/new?organization=${organization.id}`}>
                <Handshake aria-hidden />
                Register as partner
              </Link>
            </Button>
          ) : null}
          {canManage ? (
            <Button variant="outline" size="sm" onClick={() => setRenaming(true)}>
              <Pencil aria-hidden />
              Rename
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Version">{organization.version}</Detail>
          <Detail label="Created">{formatDateTime(organization.created_at)}</Detail>
          <Detail label="Last updated">{formatDateTime(organization.updated_at)}</Detail>
          <Detail label="Organization ID" className="sm:col-span-2 lg:col-span-3">
            <span className="font-mono text-xs break-all">{organization.id}</span>
          </Detail>
        </DetailList>
      </CardContent>

      {/* Mounted per opening, so the name field starts from the latest loaded name. */}
      {renaming ? (
        <FieldsDialog
          open
          onOpenChange={setRenaming}
          title="Rename organization"
          description="Changes the display name only. The ID and memberships stay the same."
          confirmLabel="Rename"
          fields={[
            { name: "name", label: "Name", maxLength: 255, defaultValue: organization.name },
          ]}
          onConfirm={async ({ name, reason }) => {
            await update.mutateAsync({
              name: name ?? "",
              reason,
              expected_version: organization.version,
            });
            toast.success(`Renamed to ${name}`);
          }}
        />
      ) : null}
    </Card>
  );
}

/** EMR-01: the Employer capacity, independent of partner status and set by an administrator. */
function EmployerCard({ organization }: { organization: Organization }) {
  const [changing, setChanging] = useState(false);
  const setCapacity = useSetEmployerCapacity(organization.id);
  const canManage = useCan(OrganizationAdminPermission.EMPLOYER_MANAGE);
  const canViewBenefits = useCan(BenefitAdminPermission.BENEFIT_VIEW);
  const enabling = !organization.is_employer;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Employer</CardTitle>
          <CardDescription>
            Lets members with the Company Benefit permissions publish benefits to this
            organization&apos;s own employees.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {canViewBenefits && organization.is_employer ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/company-benefits?organization_id=${organization.id}`}>
                <Gift aria-hidden />
                Benefits
              </Link>
            </Button>
          ) : null}
          {canManage ? (
            <Button variant="outline" size="sm" onClick={() => setChanging(true)}>
              <Building2 aria-hidden />
              {enabling ? "Turn on" : "Turn off"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Employer capacity">
            {organization.is_employer ? (
              <Badge intent="success">On</Badge>
            ) : (
              <Badge intent="outline">Off</Badge>
            )}
          </Detail>
          {organization.employer_enabled_at ? (
            <Detail label="Turned on">{formatDateTime(organization.employer_enabled_at)}</Detail>
          ) : null}
        </DetailList>
      </CardContent>
      <ReasonDialog
        open={changing}
        onOpenChange={setChanging}
        title={enabling ? "Turn on the Employer capacity?" : "Turn off the Employer capacity?"}
        description={
          enabling
            ? "Members with the Company Benefit permissions can then create and publish benefits for this organization's employees. Benefits it had before become visible again in their stored states."
            : "Its employees stop seeing its benefits at once and members can no longer manage them. Benefits and claims are kept and return if you turn it on again."
        }
        confirmLabel={enabling ? "Turn on" : "Turn off"}
        destructive={!enabling}
        onConfirm={async (reason) => {
          await setCapacity.mutateAsync({
            enabled: enabling,
            reason,
            expected_version: organization.version,
          });
          toast.success(enabling ? "Employer capacity turned on" : "Employer capacity turned off");
        }}
      />
    </Card>
  );
}

function MembershipsCard({ organizationId }: { organizationId: string }) {
  const sort = useSortParam(MEMBERSHIP_SORTS);
  const paging = usePageParam();
  const memberships = useMemberships(organizationId, sort.value, paging);
  const verify = useVerifyMembership(organizationId);
  const end = useEndMembership(organizationId);
  const canManage = useCan(OrganizationAdminPermission.MEMBERSHIP_MANAGE);
  const canViewUsers = useCan(IdentityPermission.USER_VIEW);
  const [verifying, setVerifying] = useState(false);
  const [ending, setEnding] = useState<Membership | null>(null);

  const columns: DataTableColumns<Membership> = [
    {
      id: "user",
      header: "User",
      cellClassName: "font-mono text-xs",
      cell: (membership) =>
        canViewUsers ? (
          <Link href={`/admin/users/${membership.user_id}`} className="hover:underline">
            {membership.user_id}
          </Link>
        ) : (
          membership.user_id
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: (membership) => (
        <StatusBadge domain="membership" status={membership.ended_at ? "ended" : "current"} />
      ),
    },
    {
      id: "verified",
      sortKey: "verified_at",
      header: "Verified",
      cellClassName: "text-muted-foreground",
      cell: (membership) => formatDateTime(membership.verified_at),
    },
    {
      id: "ended",
      sortKey: "ended_at",
      header: "Ended",
      cellClassName: "text-muted-foreground",
      cell: (membership) => (membership.ended_at ? formatDateTime(membership.ended_at) : "—"),
    },
    canManage && {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (membership) =>
        membership.ended_at ? null : (
          <Button variant="ghost" size="sm" onClick={() => setEnding(membership)}>
            End
          </Button>
        ),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Portal members</CardTitle>
          <CardDescription>
            Verified portal users, current and ended. Membership grants no role: assign an
            organization role from the user&apos;s page.
          </CardDescription>
        </div>
        {canManage ? (
          <Button variant="outline" size="sm" onClick={() => setVerifying(true)}>
            <Plus aria-hidden />
            Verify member
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <QueryDataTable
          aria-label="Portal members"
          query={memberships}
          sort={sort}
          paging={paging}
          columns={columns}
          rowKey={(membership) => membership.id}
          skeletonRows={3}
          className="rounded-lg"
          empty={<EmptyState icon={Users} title="No members yet" className="py-8" />}
        />
      </CardContent>

      <FieldsDialog
        open={verifying}
        onOpenChange={setVerifying}
        title="Verify a portal member"
        description="Record that this user may act for the organization. It grants no role, employee eligibility or capacity."
        confirmLabel="Verify member"
        fields={MEMBER_FIELD}
        onConfirm={async ({ user_id, reason }) => {
          await verify.mutateAsync({ user_id: user_id ?? "", reason });
          toast.success("Member verified");
        }}
      />
      <ReasonDialog
        open={ending !== null}
        onOpenChange={(open) => !open && setEnding(null)}
        title="End this membership?"
        description="The user can no longer select this organization. Their roles here stay in history but stop authorizing, and rejoining does not restore them."
        confirmLabel="End membership"
        destructive
        onConfirm={async (reason) => {
          if (!ending) return;
          await end.mutateAsync({ membershipId: ending.id, reason });
          toast.success("Membership ended");
        }}
      />
    </Card>
  );
}
