"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Info, Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { DataTable } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/primitives/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { Textarea } from "@/design-system/primitives/textarea";
import { ApiError, errorMessage, type Schemas } from "@/shared/api";
import { useSession } from "@/shared/auth";
import { IdentityPermission, useCan } from "@/shared/authorization";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";
import { useSortParam } from "@/shared/hooks/use-sort-param";

import { useReplaceRolePermissions } from "../api/mutations";
import { usePermissions, useRole } from "../api/queries";
import { editRolePermissionsSchema, type EditRolePermissionsValues } from "../schemas/admin";
import { PermissionPicker } from "./permission-picker";

type Role = Schemas["Role"];

function BackToRoles() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/admin/roles">
        <ArrowLeft aria-hidden />
        Roles
      </Link>
    </Button>
  );
}


type RoleScope = "global" | "organization" | "client";

const SCOPE_LABEL: Record<RoleScope, string> = {
  global: "Platform-wide",
  organization: "Organization",
  client: "Client (every company of one RealHRSoft group)",
};

/** The role's scope as a known value; anything unexpected reads as platform-wide. */
function roleScope(scope: string): RoleScope {
  return scope === "organization" || scope === "client" ? scope : "global";
}

export function RoleDetail({ roleId }: { roleId: string }) {
  const role = useRole(roleId);

  if (role.isPending) {
    return (
      <div className="space-y-6">
        <BackToRoles />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (role.isError) {
    return (
      <div className="space-y-6">
        <BackToRoles />
        {role.error instanceof ApiError && role.error.isNotFound ? (
          <EmptyState title="Role not found" />
        ) : (
          <ErrorState error={role.error} onRetry={() => void role.refetch()} />
        )}
      </div>
    );
  }
  return <LoadedRole role={role.data} />;
}

/** Why the permissions of this role cannot be edited here, if they cannot. */
function editBlocker(role: Role, heldRoleCodes: readonly string[]): string | null {
  if (role.is_system) return "System roles are managed by the platform and cannot be edited.";
  if (role.status !== "active") return "Retired roles cannot be changed.";
  if (heldRoleCodes.includes(role.code)) return "You hold this role, so you cannot change it.";
  return null;
}

function LoadedRole({ role }: { role: Role }) {
  const { actor } = useSession();
  const [editing, setEditing] = useState(false);
  const canManagePermissions = useCan(IdentityPermission.ROLE_PERMISSION_MANAGE);
  const canManageOrganizationRoles = useCan(IdentityPermission.ORGANIZATION_ROLE_MANAGE);
  // Organization roles also need organization-role authority (ADR-014).
  const canManage = canManagePermissions && (role.scope === "global" || canManageOrganizationRoles);
  const canViewCatalogue = useCan(IdentityPermission.PERMISSION_VIEW);
  const blocker = editBlocker(role, actor?.roles ?? []);

  return (
    <div className="space-y-6">
      <BackToRoles />
      <PageHeader
        title={role.display_name}
        description={role.description ?? undefined}
        actions={
          canManage && canViewCatalogue && !blocker && !editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil aria-hidden />
              Edit permissions
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Code">
              <span className="font-mono">{role.code}</span>
            </Detail>
            <Detail label="Status">
              <span className="flex items-center gap-2">
                <StatusBadge domain="role" status={role.status} />
                {role.is_system ? <Badge intent="info">System</Badge> : null}
              </span>
            </Detail>
            <Detail label="Scope">
              {SCOPE_LABEL[roleScope(role.scope)]}
            </Detail>
            <Detail label="Holders">{role.active_assignments}</Detail>
            <Detail label="Version">{role.version}</Detail>
          </dl>
        </CardContent>
      </Card>

      {canManage && blocker ? (
        <Alert>
          <Info aria-hidden />
          <AlertDescription>{blocker}</AlertDescription>
        </Alert>
      ) : null}

      {editing ? (
        <EditPermissions role={role} onDone={() => setEditing(false)} />
      ) : (
        <PermissionsCard role={role} />
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function PermissionsCard({ role }: { role: Role }) {
  const canViewCatalogue = useCan(IdentityPermission.PERMISSION_VIEW);
  const catalogue = usePermissions({ enabled: canViewCatalogue });
  const names = new Map(catalogue.data?.map((p) => [p.code, p.display_name]));
  const sort = useSortParam(["permission", "delegation"] as const);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
        <CardDescription>
          Delegable permissions let holders grant them onward, for example by granting roles that
          contain them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          aria-label="Role permissions"
          className="rounded-lg"
          rows={role.permissions}
          rowKey={(permission) => permission.code}
          sort={sort}
          empty={<EmptyState title="This role has no permissions" className="py-8" />}
          columns={[
            {
              id: "permission",
              header: "Permission",
              sortKey: "permission",
              sortValue: (permission) => names.get(permission.code) ?? permission.code,
              cell: (permission) => (
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {names.get(permission.code) ?? permission.code}
                  </span>
                  {names.has(permission.code) ? (
                    <span className="text-muted-foreground font-mono text-xs">
                      {permission.code}
                    </span>
                  ) : null}
                </div>
              ),
            },
            {
              id: "delegation",
              header: "Delegation",
              sortKey: "delegation",
              sortValue: (permission) => (permission.delegable ? 0 : 1),
              cell: (permission) =>
                permission.delegable ? (
                  <Badge intent="info">Can delegate</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

function EditPermissions({ role, onDone }: { role: Role; onDone: () => void }) {
  const catalogue = usePermissions();
  const replace = useReplaceRolePermissions(role.id);
  // The version this edit started from. A newer one on the server is a conflict, not a merge.
  const [baseVersion] = useState(role.version);
  const [failure, setFailure] = useState<{ stale: boolean; message: string } | null>(null);
  const form = useForm<EditRolePermissionsValues>({
    resolver: zodResolver(editRolePermissionsSchema),
    defaultValues: {
      permissions: role.permissions.map(({ code, delegable }) => ({ code, delegable })),
      reason: "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ permissions, reason }) => {
    setFailure(null);
    try {
      await replace.mutateAsync({ version: baseVersion, permissions, reason });
      toast.success(`Updated the permissions of ${role.display_name}`);
      onDone();
    } catch (error) {
      if (applyApiFieldErrors(error, form, { reason: "reason", permissions: "permissions" })) {
        return;
      }
      const stale = error instanceof ApiError && error.status === 409;
      setFailure({ stale, message: errorMessage(error) });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit permissions</CardTitle>
        <CardDescription>
          Changes apply to all {role.active_assignments} current holders. You can add or remove only
          permissions you may delegate.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="space-y-6">
            {failure ? (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertTitle>
                  {failure.stale ? "This role changed while you were editing" : "Not saved"}
                </AlertTitle>
                <AlertDescription>
                  <p>{failure.message}</p>
                  {failure.stale ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={onDone}
                    >
                      Discard my changes and reload
                    </Button>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}

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
                    scope={roleScope(role.scope)}
                  />
                )}
              />
            )}
            {errors.permissions?.message ? (
              <p className="text-destructive text-sm">{errors.permissions.message}</p>
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

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !catalogue.isSuccess || failure?.stale === true}
              >
                {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
                Save permissions
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
