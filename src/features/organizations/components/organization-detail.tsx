"use client";

import { ArrowLeft, Handshake, Pencil, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/primitives/table";
import { ApiError, type Schemas } from "@/shared/api";
import {
  IdentityPermission,
  OrganizationAdminPermission,
  PartnerAdminPermission,
  useCan,
} from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { FieldsDialog } from "@/shared/components/fields-dialog";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { StatusBadge } from "@/shared/components/status-badge";
import { ListSkeleton } from "@/shared/feedback/list-skeleton";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";

import { useEndMembership, useUpdateOrganization, useVerifyMembership } from "../api/mutations";
import { useMemberships, useOrganization } from "../api/queries";

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
            Identity only. A partner registration is a separate record; Employer capacity is not
            provisioned yet.
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

function MembershipsCard({ organizationId }: { organizationId: string }) {
  const memberships = useMemberships(organizationId);
  const verify = useVerifyMembership(organizationId);
  const end = useEndMembership(organizationId);
  const canManage = useCan(OrganizationAdminPermission.MEMBERSHIP_MANAGE);
  const canViewUsers = useCan(IdentityPermission.USER_VIEW);
  const [verifying, setVerifying] = useState(false);
  const [ending, setEnding] = useState<Membership | null>(null);

  const rows = memberships.data?.pages.flatMap((page) => page.results) ?? [];

  function userLink(userId: string) {
    return canViewUsers ? (
      <Link href={`/admin/users/${userId}`} className="hover:underline">
        {userId}
      </Link>
    ) : (
      userId
    );
  }

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
        {memberships.isPending ? (
          <ListSkeleton rows={3} />
        ) : memberships.isError ? (
          <ErrorState error={memberships.error} onRetry={() => void memberships.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title="No members yet" className="py-8" />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Ended</TableHead>
                  {canManage ? (
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((membership) => (
                  <TableRow key={membership.id}>
                    <TableCell className="font-mono text-xs">
                      {userLink(membership.user_id)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        domain="membership"
                        status={membership.ended_at ? "ended" : "current"}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(membership.verified_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {membership.ended_at ? formatDateTime(membership.ended_at) : "—"}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        {membership.ended_at ? null : (
                          <Button variant="ghost" size="sm" onClick={() => setEnding(membership)}>
                            End
                          </Button>
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {memberships.hasNextPage ? (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => void memberships.fetchNextPage()}
              disabled={memberships.isFetchingNextPage}
            >
              {memberships.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </div>
        ) : null}
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
