"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MoreHorizontal, ShieldPlus, UserMinus, UserPlus, Users, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/primitives/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/design-system/primitives/dropdown-menu";
import {
  Form,
  FormAlert,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/primitives/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage } from "@/shared/api";
import { useSelectedClientId, useSession } from "@/shared/auth";
import { ClientAdministrationPermission, useCanInClient } from "@/shared/authorization";
import { FieldsDialog } from "@/shared/components/fields-dialog";
import { QueryDataTable } from "@/shared/components/query-data-table";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";
import { reasonSchema } from "@/shared/forms/reason";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { formatDate } from "@/shared/lib/format";

import {
  useAdmitClientMember,
  useEndClientMember,
  useGrantClientRole,
  useRevokeClientRole,
} from "../api/mutations";
import { useClientMembers, useClientRoles, type ClientMember } from "../api/queries";

type MemberRole = ClientMember["roles"][number];

/**
 * The selected client's current members and the client roles each holds. Member managers
 * admit existing accounts by email and end memberships; role managers grant and revoke the
 * platform-defined client roles. The API refuses changes to your own membership or roles,
 * anything you do not hold yourself, and removing the client's last role administrator.
 */
export function ClientMembers() {
  const clientId = useSelectedClientId();
  const { actor } = useSession();
  const paging = usePageParam();
  const members = useClientMembers(clientId, paging);
  const canManageMembers = useCanInClient(ClientAdministrationPermission.MEMBER_MANAGE);
  const canManageRoles = useCanInClient(ClientAdministrationPermission.ROLE_MANAGE);
  const [admitting, setAdmitting] = useState(false);
  const [granting, setGranting] = useState<ClientMember | null>(null);
  const [ending, setEnding] = useState<ClientMember | null>(null);
  const [revoking, setRevoking] = useState<{ member: ClientMember; role: MemberRole } | null>(null);
  const admit = useAdmitClientMember(clientId);
  const end = useEndClientMember(clientId);
  const revoke = useRevokeClientRole(clientId);
  const isSelf = (member: ClientMember) => member.user_id === actor?.id;

  const columns: DataTableColumns<ClientMember> = [
    {
      id: "member",
      header: "Member",
      cell: (member) => (
        <>
          <p className="font-medium">{member.user_email}</p>
          {isSelf(member) ? <p className="text-muted-foreground text-xs">You</p> : null}
        </>
      ),
    },
    {
      id: "roles",
      header: "Client roles",
      cell: (member) =>
        member.roles.length === 0 ? (
          <span className="text-muted-foreground text-sm">No role: acts for nothing yet</span>
        ) : (
          <ul className="flex flex-wrap gap-1.5" aria-label={`Roles of ${member.user_email}`}>
            {member.roles.map((role) => (
              <li key={role.assignment_id}>
                <Badge intent="outline" className="gap-1 py-1 pr-1">
                  {role.role_name}
                  {canManageRoles && !isSelf(member) ? (
                    <button
                      type="button"
                      className="hover:bg-secondary rounded-full p-0.5"
                      aria-label={`Revoke ${role.role_name} from ${member.user_email}`}
                      onClick={() => setRevoking({ member, role })}
                    >
                      <X aria-hidden />
                    </button>
                  ) : null}
                </Badge>
              </li>
            ))}
          </ul>
        ),
    },
    {
      id: "admitted",
      header: "Admitted",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (member) => formatDate(member.verified_at),
    },
    (canManageRoles || canManageMembers) && {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (member) =>
        isSelf(member) ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Manage ${member.user_email}`}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canManageRoles ? (
                <DropdownMenuItem onSelect={() => setGranting(member)}>
                  <ShieldPlus aria-hidden />
                  Grant a role
                </DropdownMenuItem>
              ) : null}
              {canManageMembers ? (
                <DropdownMenuItem variant="destructive" onSelect={() => setEnding(member)}>
                  <UserMinus aria-hidden />
                  End membership
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      {canManageMembers ? (
        <div className="flex justify-end">
          <Button onClick={() => setAdmitting(true)}>
            <UserPlus aria-hidden />
            Admit member
          </Button>
        </div>
      ) : null}

      <QueryDataTable
        aria-label="Client members"
        query={members}
        columns={columns}
        paging={paging}
        rowKey={(member) => member.id}
        empty={
          <EmptyState
            icon={Users}
            title="No members"
            description="People who act for this client appear here with their roles."
          />
        }
      />

      <FieldsDialog
        open={admitting}
        onOpenChange={setAdmitting}
        title="Admit a member"
        description="Admits an existing Marketplace account by its email; no account is created and nothing is sent. Membership grants nothing until you grant a client role."
        confirmLabel="Admit member"
        fields={[{ name: "email", label: "Email", maxLength: 254 }]}
        onConfirm={async ({ email, reason }) => {
          await admit.mutateAsync({ email: email ?? "", reason });
          toast.success(`${email} admitted`);
        }}
      />

      {granting ? (
        <GrantRoleDialog
          clientId={clientId}
          member={granting}
          onOpenChange={(open) => !open && setGranting(null)}
        />
      ) : null}

      <ReasonDialog
        open={ending !== null}
        onOpenChange={(open) => !open && setEnding(null)}
        title="End this membership?"
        description={`${ending?.user_email ?? "The member"} stops acting for this client and all its companies at once. Their role grants stay as history; admitting them again needs new grants.`}
        confirmLabel="End membership"
        destructive
        onConfirm={async (reason) => {
          if (!ending) return;
          await end.mutateAsync({ membershipId: ending.id, reason });
          toast.success(`Membership of ${ending.user_email} ended`);
        }}
      />

      <ReasonDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title="Revoke this role?"
        description={`${revoking?.member.user_email ?? "The member"} loses ${revoking?.role.role_name ?? "the role"} in this client and its companies at once.`}
        confirmLabel="Revoke role"
        destructive
        onConfirm={async (reason) => {
          if (!revoking) return;
          await revoke.mutateAsync({
            membershipId: revoking.member.id,
            assignmentId: revoking.role.assignment_id,
            reason,
          });
          toast.success(`${revoking.role.role_name} revoked`);
        }}
      />
    </div>
  );
}

const grantSchema = z.object({
  roleId: z.string().min(1, "Choose a role"),
  reason: reasonSchema,
});
type GrantValues = z.infer<typeof grantSchema>;

/** Grants one of the roles the reader may hand out; roles the member holds are not offered. */
function GrantRoleDialog({
  clientId,
  member,
  onOpenChange,
}: {
  clientId: string;
  member: ClientMember;
  onOpenChange: (open: boolean) => void;
}) {
  const roles = useClientRoles(clientId);
  const grant = useGrantClientRole(clientId);
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<GrantValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: { roleId: "", reason: "" },
  });
  const { isSubmitting } = form.formState;
  const held = new Set(member.roles.map((role) => role.role_id));
  const offered = (roles.data ?? []).filter((role) => !held.has(role.id));

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await grant.mutateAsync({
        membershipId: member.id,
        role_id: values.roleId,
        reason: values.reason,
      });
      const role = offered.find((candidate) => candidate.id === values.roleId);
      toast.success(`Granted ${role?.display_name ?? "the role"} to ${member.user_email}`);
      onOpenChange(false);
    } catch (error) {
      if (!applyApiFieldErrors(error, form, { role_id: "roleId", reason: "reason" })) {
        setFailure(errorMessage(error));
      }
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !isSubmitting && onOpenChange(open)}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Grant a client role</DialogTitle>
              <DialogDescription>
                {member.user_email} receives the role&apos;s permissions in this client and, for its
                organization permissions, in every company of the client. You can grant only roles
                whose permissions you hold yourself.
              </DialogDescription>
            </DialogHeader>
            {failure ? <FormAlert>{failure}</FormAlert> : null}
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  {roles.isPending ? (
                    <Skeleton className="h-11 w-full rounded-lg" />
                  ) : roles.isError ? (
                    <p className="text-destructive text-sm">{errorMessage(roles.error)}</p>
                  ) : offered.length === 0 ? (
                    <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2.5 text-sm">
                      No other client role to grant.
                    </p>
                  ) : (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger ref={field.ref} onBlur={field.onBlur}>
                          <SelectValue placeholder="Choose a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {offered.map((role) => (
                          <SelectItem key={role.id} value={role.id} disabled={!role.grantable}>
                            {role.display_name}
                            {role.grantable ? null : (
                              <span className="text-muted-foreground text-xs">
                                (has permissions you lack)
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormDescription>Recorded in the audit log.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || offered.length === 0}>
                {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
                Grant role
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
