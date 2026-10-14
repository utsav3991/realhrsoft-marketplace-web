"use client";

import { ArrowLeft, KeyRound, MailPlus, Plus, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { DataTable } from "@/design-system/components/data-table";
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
import { ApiError, type Schemas } from "@/shared/api";
import { useSession } from "@/shared/auth";
import { Can, IdentityPermission, useCan } from "@/shared/authorization";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime, formatPersonName } from "@/shared/lib/format";

import {
  useDisableUser,
  useReactivateUser,
  useResendPasswordSetup,
  useRevokeRole,
} from "../api/mutations";
import { useUser } from "../api/queries";
import { ImpersonateAction } from "./impersonation";
import { AssignRoleDialog } from "./assign-role-dialog";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { useSortParam } from "@/shared/hooks/use-sort-param";

type User = Schemas["UserDetail"];
type Grant = Schemas["Grant"];

function BackToUsers() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/admin/users">
        <ArrowLeft aria-hidden />
        Users
      </Link>
    </Button>
  );
}

export function UserDetail({
  userId,
  renderExtra,
}: {
  userId: string;
  /** Cards other features add below the account, e.g. an employee's employment. */
  renderExtra?: (user: User) => ReactNode;
}) {
  const user = useUser(userId);

  if (user.isPending) {
    return (
      <div className="space-y-6">
        <BackToUsers />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (user.isError) {
    return (
      <div className="space-y-6">
        <BackToUsers />
        {user.error instanceof ApiError && user.error.isNotFound ? (
          <EmptyState title="User not found" description="The account may have been removed." />
        ) : (
          <ErrorState error={user.error} onRetry={() => void user.refetch()} />
        )}
      </div>
    );
  }
  return <LoadedUser user={user.data} extra={renderExtra?.(user.data)} />;
}

function LoadedUser({ user, extra }: { user: User; extra?: ReactNode }) {
  const { actor } = useSession();
  // The backend refuses every change to your own account; don't offer them.
  const isSelf = actor?.id === user.id;

  return (
    <div className="space-y-6">
      <BackToUsers />
      <PageHeader
        title={user.email}
        description={
          isSelf ? "This is your account. Another administrator must change it." : undefined
        }
        actions={
          isSelf ? null : (
            <div className="flex flex-wrap gap-2">
              <ImpersonateAction user={user} />
              <SetupLinkAction user={user} />
              <StatusActions user={user} />
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Status">
              <StatusBadge domain="user" status={user.status} />
            </Detail>
            <Detail label="Actor type">{user.actor_type}</Detail>
            <Detail label="Name">{formatPersonName(user.first_name, user.last_name)}</Detail>
            <Detail label="Contact">{user.contact ?? "—"}</Detail>
            <Detail label="Password">
              {user.password_setup_pending ? "Not set yet (setup link pending)" : "Set"}
            </Detail>
            <Detail label="User ID" className="sm:col-span-2 lg:col-span-4">
              <span className="font-mono text-xs break-all">{user.id}</span>
            </Detail>
          </dl>
        </CardContent>
      </Card>

      <GrantsCard user={user} isSelf={isSelf} />
      {extra}
    </div>
  );
}

function Detail({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <dt className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Only while the account has no password: it cannot sign in to get a link itself. */
function SetupLinkAction({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const resend = useResendPasswordSetup(user.id);
  if (user.status !== "active" || !user.password_setup_pending) return null;
  return (
    <Can permission={IdentityPermission.USER_PASSWORD_SETUP_RESEND}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <MailPlus aria-hidden />
        Resend setup link
      </Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Resend the setup link?"
        description={`${user.email} gets a new set-password link valid for 24 hours. Earlier links stop working.`}
        confirmLabel="Resend link"
        onConfirm={async (reason) => {
          await resend.mutateAsync({ reason });
          toast.success(`Sent a new setup link to ${user.email}`);
        }}
      />
    </Can>
  );
}

function StatusActions({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const disable = useDisableUser(user.id);
  const reactivate = useReactivateUser(user.id);

  if (user.status === "active") {
    return (
      <Can permission={IdentityPermission.USER_DISABLE}>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <UserX aria-hidden />
          Disable account
        </Button>
        <ReasonDialog
          open={open}
          onOpenChange={setOpen}
          title="Disable this account?"
          description={`${user.email} is signed out everywhere and cannot sign in until reactivated. Their role grants are kept.`}
          confirmLabel="Disable account"
          destructive
          onConfirm={async (reason) => {
            await disable.mutateAsync({ reason });
            toast.success(`Disabled ${user.email}`);
          }}
        />
      </Can>
    );
  }
  return (
    <Can permission={IdentityPermission.USER_REACTIVATE}>
      <Button onClick={() => setOpen(true)}>
        <UserCheck aria-hidden />
        Reactivate account
      </Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Reactivate this account?"
        description={`${user.email} can sign in again with their existing role grants. You can reactivate only users whose permissions you may delegate.`}
        confirmLabel="Reactivate account"
        onConfirm={async (reason) => {
          await reactivate.mutateAsync({ reason });
          toast.success(`Reactivated ${user.email}`);
        }}
      />
    </Can>
  );
}

function GrantsCard({ user, isSelf }: { user: User; isSelf: boolean }) {
  const [assigning, setAssigning] = useState(false);
  const [revoking, setRevoking] = useState<Grant | null>(null);
  const revoke = useRevokeRole(user.id);
  const canAssign = useCan(IdentityPermission.ROLE_ASSIGN);
  const canListRoles = useCan(IdentityPermission.ROLE_VIEW);
  const canRevoke = useCan(IdentityPermission.ROLE_REVOKE);
  // Organization roles are granted and revoked with organization-role authority (ADR-014).
  const canManageOrganizationRoles = useCan(IdentityPermission.ORGANIZATION_ROLE_MANAGE);
  // Grants can be revoked from a disabled user, but not given to one.
  const showAssign =
    !isSelf &&
    user.status === "active" &&
    (canAssign || canManageOrganizationRoles) &&
    canListRoles;
  const mayRevoke = (grant: Grant) =>
    !isSelf && (grant.organization_id || grant.client_id ? canManageOrganizationRoles : canRevoke);
  const showRevoke = user.grants.some(mayRevoke);
  const sort = useSortParam(["role", "scope", "granted"] as const, "grants_ordering");

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Role grants</CardTitle>
          <CardDescription>
            {user.status === "active"
              ? "Active roles held by this user, platform-wide or within one organization."
              : "Kept while the account is disabled. Roles cannot be granted to a disabled user."}
          </CardDescription>
        </div>
        {showAssign ? (
          <Button variant="outline" size="sm" onClick={() => setAssigning(true)}>
            <Plus aria-hidden />
            Grant role
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <DataTable
          aria-label="Role grants"
          className="rounded-lg"
          rows={user.grants}
          rowKey={(grant) => grant.assignment_id}
          sort={sort}
          empty={<EmptyState icon={KeyRound} title="No roles granted" className="py-8" />}
          columns={[
            {
              id: "role",
              header: "Role",
              sortKey: "role",
              sortValue: (grant) => grant.role_display_name,
              cell: (grant) => (
                <div className="flex flex-col">
                  {canListRoles ? (
                    <Link
                      href={`/admin/roles/${grant.role_id}`}
                      className="font-medium hover:underline"
                    >
                      {grant.role_display_name}
                    </Link>
                  ) : (
                    <span className="font-medium">{grant.role_display_name}</span>
                  )}
                  <span className="text-muted-foreground font-mono text-xs">{grant.role_code}</span>
                </div>
              ),
            },
            {
              id: "scope",
              header: "Scope",
              sortKey: "scope",
              sortValue: (grant) => (grant.organization_id ? 1 : grant.client_id ? 2 : 0),
              cellClassName: "text-muted-foreground",
              cell: (grant) =>
                grant.organization_id ? (
                  <span className="flex flex-col">
                    Organization
                    <span className="font-mono text-xs">{grant.organization_id}</span>
                  </span>
                ) : grant.client_id ? (
                  <span className="flex flex-col">
                    Client
                    <span className="font-mono text-xs">{grant.client_id}</span>
                  </span>
                ) : (
                  "Platform-wide"
                ),
            },
            {
              id: "granted",
              header: "Granted",
              sortKey: "granted",
              sortValue: (grant) => grant.granted_at,
              cellClassName: "text-muted-foreground",
              cell: (grant) => formatDateTime(grant.granted_at),
            },
            {
              id: "granted-by",
              header: "Granted by",
              className: "hidden md:table-cell",
              cellClassName: "text-muted-foreground font-mono text-xs",
              cell: (grant) => grant.granted_by ?? "System",
            },
            showRevoke && {
              id: "actions",
              header: <span className="sr-only">Actions</span>,
              className: "text-right",
              cell: (grant) =>
                mayRevoke(grant) ? (
                  <Button variant="ghost" size="sm" onClick={() => setRevoking(grant)}>
                    Revoke
                  </Button>
                ) : null,
            },
          ]}
        />
      </CardContent>

      {showAssign ? (
        <AssignRoleDialog
          userId={user.id}
          email={user.email}
          heldRoleIds={user.grants.map((grant) => grant.role_id)}
          open={assigning}
          onOpenChange={setAssigning}
        />
      ) : null}

      <ReasonDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title="Revoke this role?"
        description={`${user.email} loses the permissions granted by ${revoking?.role_display_name ?? "this role"}.`}
        confirmLabel="Revoke role"
        destructive
        onConfirm={async (reason) => {
          if (!revoking) return;
          await revoke.mutateAsync({ assignmentId: revoking.assignment_id, reason });
          toast.success(`Revoked ${revoking.role_display_name} from ${user.email}`);
        }}
      />
    </Card>
  );
}
