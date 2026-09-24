"use client";

import { ArrowLeft, KeyRound, Plus, UserCheck, UserX } from "lucide-react";
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
import { useSession } from "@/shared/auth";
import { Can, IdentityPermission, useCan } from "@/shared/authorization";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";

import { useDisableUser, useReactivateUser, useRevokeRole } from "../api/mutations";
import { useUser } from "../api/queries";
import { AssignRoleDialog } from "./assign-role-dialog";
import { ReasonDialog } from "./reason-dialog";

type User = Schemas["UserDetailResponse"];
type Grant = Schemas["GrantResponse"];

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

export function UserDetail({ userId }: { userId: string }) {
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
  return <LoadedUser user={user.data} />;
}

function LoadedUser({ user }: { user: User }) {
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
        actions={isSelf ? null : <StatusActions user={user} />}
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
            <Detail label="Created">{formatDateTime(user.created_at)}</Detail>
            <Detail label="Disabled">
              {user.disabled_at ? formatDateTime(user.disabled_at) : "—"}
            </Detail>
            <Detail label="User ID" className="sm:col-span-2 lg:col-span-4">
              <span className="font-mono text-xs break-all">{user.id}</span>
            </Detail>
          </dl>
        </CardContent>
      </Card>

      <GrantsCard user={user} isSelf={isSelf} />
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
  // Grants can be revoked from a disabled user, but not given to one.
  const showAssign = !isSelf && user.status === "active" && canAssign && canListRoles;
  const showRevoke = !isSelf && canRevoke;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Role grants</CardTitle>
          <CardDescription>
            {user.status === "active"
              ? "Active platform-wide roles held by this user."
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
        {user.grants.length === 0 ? (
          <EmptyState icon={KeyRound} title="No roles granted" className="py-8" />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Granted</TableHead>
                  <TableHead>Granted by</TableHead>
                  {showRevoke ? (
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.grants.map((grant) => (
                  <TableRow key={grant.assignment_id}>
                    <TableCell>
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
                        <span className="text-muted-foreground font-mono text-xs">
                          {grant.role_code}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(grant.granted_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {grant.granted_by ?? "System"}
                    </TableCell>
                    {showRevoke ? (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setRevoking(grant)}>
                          Revoke
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
