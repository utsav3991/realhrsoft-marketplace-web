"use client";

import { KeyRound } from "lucide-react";

import { DataTable, type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Stagger, StaggerItem } from "@/design-system/components/motion";
import type { Schemas } from "@/shared/api";
import { StatusBadge } from "@/shared/components/status-badge";
import { ListSkeleton } from "@/shared/feedback/list-skeleton";
import { ErrorState } from "@/shared/feedback/states";
import { useSortParam } from "@/shared/hooks/use-sort-param";

import { usePermissions } from "../api/queries";

type Permission = Schemas["Permission"];

function byModule(permissions: readonly Permission[]): [string, Permission[]][] {
  const modules = new Map<string, Permission[]>();
  for (const permission of permissions) {
    modules.set(permission.module, [...(modules.get(permission.module) ?? []), permission]);
  }
  return [...modules.entries()];
}

const COLUMNS: DataTableColumns<Permission> = [
  {
    id: "permission",
    header: "Permission",
    sortKey: "name",
    sortValue: (permission) => permission.display_name,
    cell: (permission) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{permission.display_name}</span>
        <span className="text-muted-foreground font-mono text-xs">{permission.code}</span>
      </div>
    ),
  },
  {
    id: "description",
    header: "Description",
    className: "hidden md:table-cell",
    cellClassName: "text-muted-foreground max-w-md whitespace-normal",
    cell: (permission) => permission.description ?? "—",
  },
  {
    id: "scope",
    header: "Scope",
    sortKey: "scope",
    sortValue: (permission) => permission.scope,
    cellClassName: "text-muted-foreground",
    cell: (permission) => (permission.scope === "organization" ? "Organization" : "Platform-wide"),
  },
  {
    id: "status",
    header: "Status",
    cell: (permission) => <StatusBadge domain="permission" status={permission.status} />,
  },
];

/** Read-only: the catalogue is defined by the backend, one code per enforced check. */
const SORTS = ["name", "scope"] as const;

export function PermissionsCatalogue() {
  const permissions = usePermissions();
  const sort = useSortParam(SORTS);

  if (permissions.isPending) return <ListSkeleton rows={6} />;
  if (permissions.isError) {
    return <ErrorState error={permissions.error} onRetry={() => void permissions.refetch()} />;
  }
  if (permissions.data.length === 0) {
    return <EmptyState icon={KeyRound} title="The permission catalogue is empty" />;
  }

  return (
    <Stagger className="space-y-6">
      {byModule(permissions.data).map(([module, entries]) => (
        <StaggerItem key={module}>
          <section aria-labelledby={`module-${module}`} className="space-y-2">
            <h2
              id={`module-${module}`}
              className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
            >
              {module}
            </h2>
            <DataTable
              aria-label={`${module} permissions`}
              columns={COLUMNS}
              rows={entries}
              rowKey={(permission) => permission.code}
              sort={sort}
            />
          </section>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
