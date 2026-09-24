"use client";

import { ArrowLeft, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
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
import { IdentityPermission, OrganizationAdminPermission, useCan } from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { FieldsDialog } from "@/shared/components/fields-dialog";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { StatusBadge } from "@/shared/components/status-badge";
import { ListSkeleton } from "@/shared/feedback/list-skeleton";
import { ErrorState } from "@/shared/feedback/states";
import { formatDate, formatDateTime } from "@/shared/lib/format";

import { useAddMember, useChangeEmployerProfile, useRemoveMember } from "../api/mutations";
import { useMembers, useOrganization } from "../api/queries";

type Organization = Schemas["OrganizationResponse"];
type Member = Schemas["MemberResponse"];

const MEMBER_FIELD = [
  {
    name: "user_id",
    label: "User ID",
    kind: "uuid",
    hint: "Copy it from the user's page. Accounts are created by Aayulogic, never here.",
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

/** `children` renders below the capacities (the page adds the commercial entitlement). */
export function OrganizationDetail({
  organizationId,
  children,
}: {
  organizationId: string;
  children?: ReactNode;
}) {
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
      <CapacitiesCard organization={organization.data} />
      {children}
      <MembersCard organizationId={organizationId} />
    </div>
  );
}

type PendingChange = { kind: "employer"; action: "enable" | "disable" };

const CHANGE_COPY: Record<string, { title: string; description: string; confirm: string }> = {
  "employer:enable": {
    title: "Enable the Employer profile?",
    description:
      "Members holding Employer roles can manage Company Benefits for this organization's employees.",
    confirm: "Enable",
  },
  "employer:disable": {
    title: "Disable the Employer profile?",
    description: "The Employer portal closes for this organization. Benefits are kept.",
    confirm: "Disable",
  },
};

function CapacitiesCard({ organization }: { organization: Organization }) {
  const [pending, setPending] = useState<PendingChange | null>(null);
  const employer = useChangeEmployerProfile(organization.id);
  const canManage = useCan(OrganizationAdminPermission.ORGANIZATION_MANAGE);
  const canSearchPartners = useCan(OrganizationAdminPermission.PARTNER_SEARCH);
  const copy = pending ? CHANGE_COPY[`${pending.kind}:${pending.action}`] : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacities</CardTitle>
        <CardDescription>
          Employer and Partner are independent: holding one never grants the other.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Employer profile">
            <div className="flex flex-wrap items-center gap-2">
              {organization.employer_status ? (
                <StatusBadge domain="employerProfile" status={organization.employer_status} />
              ) : (
                <span className="text-muted-foreground">Not enabled</span>
              )}
              {canManage ? (
                organization.employer_status === "enabled" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPending({ kind: "employer", action: "disable" })}
                  >
                    Disable
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPending({ kind: "employer", action: "enable" })}
                  >
                    Enable
                  </Button>
                )
              ) : null}
            </div>
          </Detail>
          <Detail label="Partner">
            <div className="flex flex-wrap items-center gap-2">
              {organization.partner_status ? (
                <StatusBadge domain="partnerProfile" status={organization.partner_status} />
              ) : (
                <span className="text-muted-foreground">Attached by verifying a Partner</span>
              )}
              {organization.partner_status && canSearchPartners ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/partners?organization_id=${organization.id}`}>
                    Open Partner record
                  </Link>
                </Button>
              ) : null}
            </div>
          </Detail>
          <Detail label="Created">{formatDateTime(organization.created_at)}</Detail>
          <Detail label="Organization ID" className="sm:col-span-2 lg:col-span-3">
            <span className="font-mono text-xs break-all">{organization.id}</span>
          </Detail>
        </DetailList>
      </CardContent>

      <ReasonDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={copy?.title ?? ""}
        description={copy?.description ?? ""}
        confirmLabel={copy?.confirm ?? "Confirm"}
        destructive={pending?.action === "disable"}
        onConfirm={async (reason) => {
          if (!pending) return;
          await employer.mutateAsync({ action: pending.action, reason });
          toast.success(`${copy?.confirm ?? "Updated"}: ${organization.name}`);
        }}
      />
    </Card>
  );
}

function MembersCard({ organizationId }: { organizationId: string }) {
  const members = useMembers(organizationId);
  const add = useAddMember(organizationId);
  const remove = useRemoveMember(organizationId);
  const canManage = useCan(OrganizationAdminPermission.MEMBERSHIP_MANAGE);
  const canViewUsers = useCan(IdentityPermission.USER_VIEW);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Verified members</CardTitle>
          <CardDescription>
            Only members can receive this organization&apos;s roles. Removing a member ends their
            access to it immediately.
          </CardDescription>
        </div>
        {canManage ? (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden />
            Add member
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {members.isPending ? (
          <ListSkeleton rows={3} />
        ) : members.isError ? (
          <ErrorState error={members.error} onRetry={() => void members.refetch()} />
        ) : members.data.length === 0 ? (
          <EmptyState icon={Users} title="No members yet" className="py-8" />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Added by</TableHead>
                  {canManage ? (
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.data.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="font-mono text-xs">
                      {canViewUsers ? (
                        <Link href={`/admin/users/${member.user_id}`} className="hover:underline">
                          {member.user_id}
                        </Link>
                      ) : (
                        member.user_id
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(member.added_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {member.added_by}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setRemoving(member)}>
                          Remove
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <FieldsDialog
        open={adding}
        onOpenChange={setAdding}
        title="Add a verified member"
        description="Record that this user belongs to the organization. It grants no permissions: assign an organization role from the user's page."
        confirmLabel="Add member"
        fields={MEMBER_FIELD}
        onConfirm={async ({ user_id, reason }) => {
          await add.mutateAsync({ user_id: user_id ?? "", reason });
          toast.success("Member added");
        }}
      />
      <ReasonDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove this member?"
        description="The user loses access to this organization at once, and their roles here are revoked."
        confirmLabel="Remove member"
        destructive
        onConfirm={async (reason) => {
          if (!removing) return;
          await remove.mutateAsync({ userId: removing.user_id, reason });
          toast.success("Member removed");
        }}
      />
    </Card>
  );
}
