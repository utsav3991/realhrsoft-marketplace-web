"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailPlus, Network, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Checkbox } from "@/design-system/primitives/checkbox";
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
  Form,
  FormAlert,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/primitives/form";
import { Switch } from "@/design-system/primitives/switch";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage, type Schemas } from "@/shared/api";
import { useFeatureFlags } from "@/features/integrations/api/queries";
import {
  FeatureFlagAdminPermission,
  IdentityPermission,
  OrganizationAdminPermission,
  useCan,
} from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { FieldsDialog } from "@/shared/components/fields-dialog";
import { QueryDataTable } from "@/shared/components/query-data-table";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { reasonSchema } from "@/shared/forms/reason";
import { StatusBadge } from "@/shared/components/status-badge";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { formatDate } from "@/shared/lib/format";

import {
  useAdmitClientMembership,
  useEndClientMembership,
  useInviteClientContact,
  useSetEmployerAutoEnable,
} from "../api/mutations";
import { useClientMemberships, type Partner } from "../api/queries";

type ClientMembership = Schemas["ClientMembership"];
type ContactInvite = Schemas["ContactInvite"];

/** The rollout switch for creating client administrator accounts from the contact. */
const PROVISIONING_FLAG = "realhrsoft.client_provisioning";

/** What inviting the contact did, in words for a toast. */
function inviteMessage(invite: ContactInvite, email: string): string {
  if (invite.skipped === "administrator_exists")
    return "The client already has an administrator, so the contact was not invited.";
  switch (invite.outcome) {
    case "created":
      return `Account created for ${email}; they were emailed a link to set a password.`;
    case "added":
    case "rejoined":
      return `${email} already had an account; they were told they now administer this client.`;
    case "role_repaired":
      return `${email} got the client administrator role back.`;
    default:
      return `${email} already administers this client.`;
  }
}

/** Whether the client-administrator provisioning switch is on, when the reader may see it. */
function useProvisioningFlag(): boolean | null {
  const canView = useCan(FeatureFlagAdminPermission.FLAG_VIEW);
  const flags = useFeatureFlags({ enabled: canView });
  if (!canView || !flags.data) return null;
  return flags.data.some((flag) => flag.key === PROVISIONING_FLAG && flag.enabled);
}

/**
 * A RealHRSoft client (a group of companies): its identity in RealHRSoft, the client-level
 * Employer opt-in and who acts for it. Client roles are granted on each user's page
 * (Grant a role, in a client); the client's own administrators manage the rest in the
 * Client portal.
 */
export function ClientAdministration({ partner }: { partner: Partner }) {
  const canManageMembers = useCan(OrganizationAdminPermission.MEMBERSHIP_MANAGE);
  const canManageEmployer = useCan(OrganizationAdminPermission.EMPLOYER_MANAGE);
  // A seat is admission plus a role grant, so inviting needs both authorities.
  const canGrantRoles = useCan(IdentityPermission.ORGANIZATION_ROLE_MANAGE);
  const canInvite = canManageMembers && canGrantRoles;
  const provisioning = useProvisioningFlag();
  const invite = useInviteClientContact(partner.id);
  const [inviting, setInviting] = useState(false);
  const paging = usePageParam("members_");
  const members = useClientMemberships(partner.id, paging, { enabled: canManageMembers });
  const admit = useAdmitClientMembership(partner.id);
  const end = useEndClientMembership(partner.id);
  const optIn = useSetEmployerAutoEnable(partner.id);
  const [admitting, setAdmitting] = useState(false);
  const [ending, setEnding] = useState<ClientMembership | null>(null);
  const [switching, setSwitching] = useState(false);

  const columns: DataTableColumns<ClientMembership> = [
    {
      id: "member",
      header: "Member",
      cell: (member) => <span className="font-medium">{member.user_email}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (member) => (
        <StatusBadge domain="membership" status={member.is_current ? "current" : "ended"} />
      ),
    },
    {
      id: "since",
      header: "Admitted",
      cellClassName: "text-muted-foreground",
      cell: (member) => formatDate(member.verified_at),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (member) =>
        member.is_current ? (
          <Button variant="ghost" size="sm" onClick={() => setEnding(member)}>
            End
          </Button>
        ) : null,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="size-4" aria-hidden />
          RealHRSoft client
        </CardTitle>
        <CardDescription>
          RealHRSoft owns this client and its companies. Client roles held by its members apply in
          every company of the client, including ones synchronized later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <DetailList>
          <Detail label="RealHRSoft client">
            <span className="font-mono text-xs">{partner.external_uuid}</span>
          </Detail>
          <Detail label="State">
            <Badge intent={partner.active ? "success" : "neutral"}>
              {partner.active ? "Active" : "Deactivated by RealHRSoft"}
            </Badge>
          </Detail>
          <Detail label="Contact">
            <span className="flex flex-wrap items-center gap-2">
              {partner.contact_email}
              {partner.contact_is_member === null ? null : (
                <Badge intent={partner.contact_is_member ? "success" : "warning"}>
                  {partner.contact_is_member ? "Member" : "Not a member"}
                </Badge>
              )}
            </span>
          </Detail>
          {provisioning === null ? null : (
            <Detail label="Contact invitations">
              <Badge intent={provisioning ? "success" : "neutral"}>
                {provisioning ? "On" : "Off (realhrsoft.client_provisioning)"}
              </Badge>
            </Detail>
          )}
          <Detail label="Employer opt-in">
            <span className="flex items-center gap-2">
              <Switch
                checked={partner.employer_auto_enabled}
                disabled={!canManageEmployer}
                onCheckedChange={() => setSwitching(true)}
                aria-label="Employer opt-in for companies synchronized later"
              />
              {partner.employer_auto_enabled ? "On" : "Off"}
            </span>
          </Detail>
        </DetailList>

        {canInvite && partner.contact_is_member === false && partner.active ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <p className="text-muted-foreground text-sm">
              The RealHRSoft contact is not a member of this client. Invite them to give them an
              account (or link theirs) with the client administrator role.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={provisioning === false}
              onClick={() => setInviting(true)}
            >
              <MailPlus aria-hidden />
              Invite contact
            </Button>
          </div>
        ) : null}

        {canManageMembers ? (
          <section className="space-y-3" aria-labelledby="client-members">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="client-members" className="text-sm font-semibold">
                Members
              </h3>
              <Button variant="outline" size="sm" onClick={() => setAdmitting(true)}>
                <UserPlus aria-hidden />
                Admit member
              </Button>
            </div>
            <QueryDataTable
              aria-label="Client members"
              query={members}
              columns={columns}
              paging={paging}
              rowKey={(member) => member.id}
              skeletonRows={2}
              className="rounded-lg"
              empty={
                <EmptyState
                  icon={Users}
                  title="No members"
                  description="Admit a user, then grant them a client role on their user page."
                  className="py-8"
                />
              }
            />
          </section>
        ) : null}
      </CardContent>

      <FieldsDialog
        open={admitting}
        onOpenChange={setAdmitting}
        title="Admit a client member"
        description="Membership grants nothing by itself: grant a client role on the user's page next."
        confirmLabel="Admit member"
        fields={[
          {
            name: "user_id",
            label: "User ID",
            kind: "uuid",
            hint: "Copy it from the user's page.",
          },
        ]}
        onConfirm={async ({ user_id, reason }) => {
          await admit.mutateAsync({ user_id: user_id ?? "", reason });
          toast.success("Member admitted");
        }}
      />

      <ReasonDialog
        open={ending !== null}
        onOpenChange={(open) => !open && setEnding(null)}
        title="End this membership?"
        description={`${ending?.user_email ?? "The member"} stops acting for this client and its companies at once; their role grants stay as history. Platform administrators may end the client's last role administrator.`}
        confirmLabel="End membership"
        destructive
        onConfirm={async (reason) => {
          if (!ending) return;
          await end.mutateAsync({ membershipId: ending.id, reason });
          toast.success(`Membership of ${ending.user_email} ended`);
        }}
      />

      <ReasonDialog
        open={inviting}
        onOpenChange={setInviting}
        title="Invite the client's contact?"
        description={`${partner.contact_email} becomes a member with the client administrator role. A new account is emailed a link to set a password; an existing one is told it has access.`}
        confirmLabel="Invite contact"
        onConfirm={async (reason) => {
          const result = await invite.mutateAsync({ reason });
          toast.success(inviteMessage(result, partner.contact_email));
        }}
      />

      {switching ? (
        <EmployerOptInDialog
          partner={partner}
          canInvite={canInvite && provisioning !== false}
          onDone={() => setSwitching(false)}
          onConfirm={(body) => optIn.mutateAsync(body)}
        />
      ) : null}
    </Card>
  );
}

const optInSchema = z.object({
  includeExisting: z.boolean(),
  inviteContact: z.boolean(),
  reason: reasonSchema,
});
type OptInValues = z.infer<typeof optInSchema>;

/** Switches the client-level Employer opt-in, optionally for the current companies too. */
function EmployerOptInDialog({
  partner,
  canInvite,
  onDone,
  onConfirm,
}: {
  partner: Partner;
  /** May also invite the contact (role-grant authority, provisioning switch not off). */
  canInvite: boolean;
  onDone: () => void;
  onConfirm: (body: Schemas["EmployerAutoEnable"]) => Promise<Schemas["EmployerOptIn"]>;
}) {
  const enable = !partner.employer_auto_enabled;
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<OptInValues>({
    resolver: zodResolver(optInSchema),
    defaultValues: { includeExisting: true, inviteContact: false, reason: "" },
  });
  const { isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      const inviteContact = enable && canInvite && values.inviteContact;
      const result = await onConfirm({
        enabled: enable,
        include_existing: enable && values.includeExisting,
        invite_contact: inviteContact,
        expected_version: partner.version,
        reason: values.reason,
      });
      toast.success(`Employer opt-in turned ${enable ? "on" : "off"}`);
      if (result.invite) toast.info(inviteMessage(result.invite, partner.contact_email));
      onDone();
    } catch (error) {
      setFailure(errorMessage(error));
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onDone()}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle>
                {enable ? "Turn the Employer opt-in on?" : "Turn the Employer opt-in off?"}
              </DialogTitle>
              <DialogDescription>
                {enable
                  ? "Every company RealHRSoft synchronizes for this client from now on gets Employer capacity at once, so client benefits reach its employees. Each company can still be switched off on its own."
                  : "Companies synchronized from now on need Employer capacity switched on one by one. Companies that have it keep it."}
              </DialogDescription>
            </DialogHeader>
            {failure ? <FormAlert>{failure}</FormAlert> : null}
            {enable ? (
              <FormField
                control={form.control}
                name="includeExisting"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <FormLabel className="font-medium">
                      Also give the client&apos;s current active companies Employer capacity
                    </FormLabel>
                  </FormItem>
                )}
              />
            ) : null}
            {enable && canInvite ? (
              <FormField
                control={form.control}
                name="inviteContact"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <FormLabel className="font-medium">
                      Also invite {partner.contact_email} as client administrator, unless the client
                      already has one
                    </FormLabel>
                  </FormItem>
                )}
              />
            ) : null}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
                {enable ? "Turn on" : "Turn off"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
