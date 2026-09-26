"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
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
import { Input } from "@/design-system/primitives/input";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { Textarea } from "@/design-system/primitives/textarea";
import { errorMessage } from "@/shared/api";
import { IdentityPermission, useCan } from "@/shared/authorization";
import { ErrorState } from "@/shared/feedback/states";
import { cn } from "@/shared/lib/cn";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import { useCreateRole } from "../api/mutations";
import { usePermissions } from "../api/queries";
import { createRoleSchema, type CreateRoleValues } from "../schemas/admin";
import { PermissionPicker } from "./permission-picker";

const SCOPES = [
  {
    value: "global",
    label: "Platform-wide",
    description: "Aayulogic administration. Granted without an organization.",
  },
  {
    value: "organization",
    label: "Organization",
    description: "Employer or Partner portal work inside one organization.",
  },
] as const;

export function CreateRoleForm() {
  const router = useRouter();
  const catalogue = usePermissions();
  const createRole = useCreateRole();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<CreateRoleValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      scope: "global",
      code: "",
      displayName: "",
      description: "",
      permissions: [],
      reason: "",
    },
  });
  const { errors, isSubmitting } = form.formState;
  // Organization roles need organization-role authority as well as role creation.
  const canCreateOrganizationRoles = useCan(IdentityPermission.ORGANIZATION_ROLE_MANAGE);
  const scope = useWatch({ control: form.control, name: "scope" });

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      const { id } = await createRole.mutateAsync({
        code: values.code,
        display_name: values.displayName,
        description: values.description || null,
        permissions: values.permissions,
        scope: values.scope,
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
        scope: "scope",
        reason: "reason",
      });
      if (!placed) setFailure(errorMessage(error));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {failure ? <FormAlert title="The role was not created">{failure}</FormAlert> : null}

        {canCreateOrganizationRoles ? (
          <Card>
            <CardHeader>
              <CardTitle>Where the role applies</CardTitle>
              <CardDescription>
                Fixed once created. A role holds permissions of one scope only, and neither scope
                can stand in for the other.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <div
                    role="radiogroup"
                    aria-label="Role scope"
                    className="grid gap-2 sm:grid-cols-2"
                  >
                    {SCOPES.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={field.value === option.value}
                        disabled={isSubmitting}
                        onClick={() => {
                          if (field.value === option.value) return;
                          field.onChange(option.value);
                          form.setValue("permissions", []);
                        }}
                        className={cn(
                          "focus-visible:border-ring focus-visible:ring-ring rounded-lg border p-4 text-left text-sm transition-colors outline-none focus-visible:ring-1",
                          field.value === option.value
                            ? "border-ring bg-accent border-2 p-[15px]"
                            : "hover:bg-muted",
                        )}
                      >
                        <span className="block font-medium">{option.label}</span>
                        <span className="text-muted-foreground block">{option.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="off"
                      spellCheck={false}
                      className="font-mono"
                      placeholder="support_agent"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Permanent identifier. It cannot be changed later.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display name</FormLabel>
                  <FormControl>
                    <Input placeholder="Support agent" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel optional>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>
              {scope === "global"
                ? "You can include only permissions you may delegate yourself."
                : "Portal permissions, granted to verified members within one organization."}
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
                    scope={scope}
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
    </Form>
  );
}
