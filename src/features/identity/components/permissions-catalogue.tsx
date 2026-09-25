"use client";

import { KeyRound } from "lucide-react";

import { EmptyState } from "@/design-system/components/empty-state";
import { Skeleton } from "@/design-system/primitives/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/primitives/table";
import type { Schemas } from "@/shared/api";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";

import { usePermissions } from "../api/queries";

type Permission = Schemas["Permission"];

function byModule(permissions: readonly Permission[]): [string, Permission[]][] {
  const modules = new Map<string, Permission[]>();
  for (const permission of permissions) {
    modules.set(permission.module, [...(modules.get(permission.module) ?? []), permission]);
  }
  return [...modules.entries()];
}

/** Read-only: the catalogue is defined by the backend, one code per enforced check. */
export function PermissionsCatalogue() {
  const permissions = usePermissions();

  if (permissions.isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (permissions.isError) {
    return <ErrorState error={permissions.error} onRetry={() => void permissions.refetch()} />;
  }
  if (permissions.data.length === 0) {
    return <EmptyState icon={KeyRound} title="The permission catalogue is empty" />;
  }

  return (
    <div className="space-y-6">
      {byModule(permissions.data).map(([module, entries]) => (
        <section key={module} aria-labelledby={`module-${module}`} className="space-y-2">
          <h2
            id={`module-${module}`}
            className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
          >
            {module}
          </h2>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((permission) => (
                  <TableRow key={permission.code}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{permission.display_name}</span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {permission.code}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-md whitespace-normal">
                      {permission.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {permission.scope === "organization" ? "Organization" : "Platform-wide"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge domain="permission" status={permission.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}
    </div>
  );
}
