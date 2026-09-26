"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

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
import { Input } from "@/design-system/primitives/input";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage } from "@/shared/api";
import { IdentityPermission, useCan } from "@/shared/authorization";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import { useAssignRole } from "../api/mutations";
import { useRoles } from "../api/queries";
import { assignRoleSchema, type AssignRoleValues } from "../schemas/admin";

interface AssignRoleDialogProps {
  userId: string;
  email: string;
  /** Platform-wide roles the user already holds; they are not offered again. */
  heldRoleIds: readonly string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignRoleDialog({
  userId,
  email,
  heldRoleIds,
  open,
  onOpenChange,
}: AssignRoleDialogProps) {
  const roles = useRoles({ enabled: open });
  const assign = useAssignRole(userId);
  const [failure, setFailure] = useState<string | null>(null);
  const canAssignGlobal = useCan(IdentityPermission.ROLE_ASSIGN);
  const canAssignOrganization = useCan(IdentityPermission.ORGANIZATION_ROLE_MANAGE);
  const form = useForm<AssignRoleValues>({
    resolver: zodResolver(assignRoleSchema),
    defaultValues: {
      scope: canAssignGlobal ? "global" : "organization",
      organizationId: "",
      roleId: "",
      reason: "",
    },
  });
  const { isSubmitting } = form.formState;
  const scope = useWatch({ control: form.control, name: "scope" });

  // A role is granted in its own scope only: global roles platform-wide, organization roles
  // within one organization to a verified member (ADR-014).
  const grantable = (roles.data ?? []).filter(
    (role) =>
      role.status === "active" &&
      role.scope === scope &&
      (scope === "organization" || !heldRoleIds.includes(role.id)),
  );

  function handleOpenChange(next: boolean) {
    if (isSubmitting) return;
    if (!next) {
      form.reset();
      setFailure(null);
    }
    onOpenChange(next);
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await assign.mutateAsync({
        roleId: values.roleId,
        organizationId: values.scope === "organization" ? values.organizationId : null,
        reason: values.reason,
      });
      const role = grantable.find((candidate) => candidate.id === values.roleId);
      toast.success(`Granted ${role?.display_name ?? "the role"} to ${email}`);
      handleOpenChange(false);
    } catch (error) {
      const placed = applyApiFieldErrors(error, form, {
        role_id: "roleId",
        organization_id: "organizationId",
        reason: "reason",
      });
      if (!placed) setFailure(errorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Grant a role</DialogTitle>
              <DialogDescription>
                {scope === "global"
                  ? `${email} receives every permission in the role, platform-wide. You can grant only roles whose permissions you may delegate.`
                  : `${email} receives the role's portal permissions in one organization, where they must already be a verified member.`}
              </DialogDescription>
            </DialogHeader>

            {failure ? <FormAlert>{failure}</FormAlert> : null}

            {canAssignGlobal && canAssignOrganization ? (
              <div role="radiogroup" aria-label="Where the role applies" className="flex gap-1">
                {(["global", "organization"] as const).map((option) => (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    role="radio"
                    aria-checked={scope === option}
                    variant={scope === option ? "secondary" : "ghost"}
                    onClick={() => {
                      form.setValue("scope", option);
                      form.setValue("roleId", "");
                    }}
                  >
                    {option === "global" ? "Platform-wide" : "In an organization"}
                  </Button>
                ))}
              </div>
            ) : null}

            {scope === "organization" ? (
              <FormField
                control={form.control}
                name="organizationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization ID</FormLabel>
                    <FormControl>
                      <Input
                        className="font-mono"
                        autoComplete="off"
                        spellCheck={false}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Copy it from the organization&apos;s page.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

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
                  ) : grantable.length === 0 ? (
                    <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2.5 text-sm">
                      {scope === "global"
                        ? "There are no other active platform-wide roles to grant."
                        : "There are no active organization roles."}
                    </p>
                  ) : (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger ref={field.ref} onBlur={field.onBlur}>
                          <SelectValue placeholder="Choose a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {grantable.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.display_name}
                            <span className="text-muted-foreground font-mono text-xs">
                              {role.code}
                            </span>
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
              <Button type="submit" disabled={isSubmitting || grantable.length === 0}>
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
