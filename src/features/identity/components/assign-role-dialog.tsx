"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { fieldDescriptionIds, FormField } from "@/design-system/components/form-field";
import { Alert, AlertDescription } from "@/design-system/primitives/alert";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage } from "@/shared/api";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import { useAssignRole } from "../api/mutations";
import { useRoles } from "../api/queries";
import { assignRoleSchema, type AssignRoleValues } from "../schemas/admin";

interface AssignRoleDialogProps {
  userId: string;
  email: string;
  /** Roles the user already holds; they are not offered again. */
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
  const form = useForm<AssignRoleValues>({
    resolver: zodResolver(assignRoleSchema),
    defaultValues: { roleId: "", reason: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const grantable = (roles.data ?? []).filter(
    (role) => role.status === "active" && !heldRoleIds.includes(role.id),
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
      await assign.mutateAsync(values);
      const role = grantable.find((candidate) => candidate.id === values.roleId);
      toast.success(`Granted ${role?.display_name ?? "the role"} to ${email}`);
      handleOpenChange(false);
    } catch (error) {
      const placed = applyApiFieldErrors(error, form, { role_id: "roleId", reason: "reason" });
      if (!placed) setFailure(errorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Grant a role</DialogTitle>
            <DialogDescription>
              {email} receives every permission in the role, platform-wide. You can grant only roles
              whose permissions you may delegate.
            </DialogDescription>
          </DialogHeader>

          {failure ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          ) : null}

          <FormField id="role" label="Role" error={errors.roleId?.message}>
            {roles.isPending ? (
              <Skeleton className="h-9 w-full" />
            ) : roles.isError ? (
              <p className="text-destructive text-sm">{errorMessage(roles.error)}</p>
            ) : grantable.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                There are no other active roles to grant.
              </p>
            ) : (
              <Controller
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="role"
                      ref={field.ref}
                      onBlur={field.onBlur}
                      aria-invalid={errors.roleId ? true : undefined}
                      aria-describedby={fieldDescriptionIds("role", { error: errors.roleId })}
                    >
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
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
              />
            )}
          </FormField>

          <FormField
            id="grant-reason"
            label="Reason"
            hint="Recorded in the audit log."
            error={errors.reason?.message}
          >
            <Textarea
              id="grant-reason"
              rows={3}
              aria-invalid={errors.reason ? true : undefined}
              aria-describedby={fieldDescriptionIds("grant-reason", {
                hint: true,
                error: errors.reason,
              })}
              {...form.register("reason")}
            />
          </FormField>

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
      </DialogContent>
    </Dialog>
  );
}
