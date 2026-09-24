"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { fieldDescriptionIds, FormField } from "@/design-system/components/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Input } from "@/design-system/primitives/input";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage } from "@/shared/api";
import { ErrorState } from "@/shared/feedback/states";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import { useCreateRole } from "../api/mutations";
import { usePermissions } from "../api/queries";
import { createRoleSchema, type CreateRoleValues } from "../schemas/admin";
import { PermissionPicker } from "./permission-picker";

export function CreateRoleForm() {
  const router = useRouter();
  const catalogue = usePermissions();
  const createRole = useCreateRole();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<CreateRoleValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { code: "", displayName: "", description: "", permissions: [], reason: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      const { id } = await createRole.mutateAsync({
        code: values.code,
        display_name: values.displayName,
        description: values.description || null,
        permissions: values.permissions,
        reason: values.reason,
      });
      toast.success(`Created ${values.displayName}`);
      router.push(`/admin/roles/${id}`);
    } catch (error) {
      const placed = applyApiFieldErrors(error, form, {
        code: "code",
        display_name: "displayName",
        description: "description",
        permissions: "permissions",
        reason: "reason",
      });
      if (!placed) setFailure(errorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {failure ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>The role was not created</AlertTitle>
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="code"
            label="Code"
            hint="Permanent identifier, for example support_agent. It cannot be changed later."
            error={errors.code?.message}
          >
            <Input
              id="code"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              aria-invalid={errors.code ? true : undefined}
              aria-describedby={fieldDescriptionIds("code", { hint: true, error: errors.code })}
              {...form.register("code")}
            />
          </FormField>
          <FormField id="display-name" label="Display name" error={errors.displayName?.message}>
            <Input
              id="display-name"
              aria-invalid={errors.displayName ? true : undefined}
              aria-describedby={fieldDescriptionIds("display-name", {
                error: errors.displayName,
              })}
              {...form.register("displayName")}
            />
          </FormField>
          <FormField
            id="description"
            label="Description"
            hint="Optional."
            error={errors.description?.message}
            className="sm:col-span-2"
          >
            <Textarea
              id="description"
              rows={2}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={fieldDescriptionIds("description", {
                hint: true,
                error: errors.description,
              })}
              {...form.register("description")}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            You can include only permissions you may delegate yourself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {catalogue.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : catalogue.isError ? (
            <ErrorState error={catalogue.error} onRetry={() => void catalogue.refetch()} />
          ) : (
            <Controller
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <PermissionPicker
                  catalogue={catalogue.data}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
          )}
          {errors.permissions?.message ? (
            <p className="text-destructive text-sm">{errors.permissions.message}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <FormField
            id="create-reason"
            label="Reason"
            hint="Recorded in the audit log."
            error={errors.reason?.message}
          >
            <Textarea
              id="create-reason"
              rows={3}
              aria-invalid={errors.reason ? true : undefined}
              aria-describedby={fieldDescriptionIds("create-reason", {
                hint: true,
                error: errors.reason,
              })}
              {...form.register("reason")}
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href="/admin/roles">Cancel</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting || !catalogue.isSuccess}>
          {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Create role
        </Button>
      </div>
    </form>
  );
}
