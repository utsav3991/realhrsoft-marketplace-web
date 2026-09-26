"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { DataTable, type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Badge } from "@/design-system/primitives/badge";
import type { Schemas } from "@/shared/api";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { useSortParam } from "@/shared/hooks/use-sort-param";

import { useRoles } from "../api/queries";

const COLUMNS: DataTableColumns<Schemas["Role"]> = [
  {
    id: "role",
    header: "Role",
    sortKey: "name",
    sortValue: (role) => role.display_name,
    cell: (role) => (
      <div className="flex flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/roles/${role.id}`} className="font-medium hover:underline">
            {role.display_name}
          </Link>
          {role.is_system ? <Badge intent="info">System</Badge> : null}
          {role.scope === "organization" ? <Badge intent="outline">Organization</Badge> : null}
        </span>
        <span className="text-muted-foreground font-mono text-xs">{role.code}</span>
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: (role) => <StatusBadge domain="role" status={role.status} />,
  },
  {
    id: "permissions",
    header: "Permissions",
    sortKey: "permissions",
    sortValue: (role) => role.permissions.length,
    className: "text-right",
    cellClassName: "tabular-nums",
    cell: (role) => role.permissions.length,
  },
  {
    id: "holders",
    header: "Holders",
    sortKey: "holders",
    sortValue: (role) => role.active_assignments,
    className: "text-right",
    cellClassName: "tabular-nums",
    cell: (role) => role.active_assignments,
  },
];

const SORTS = ["name", "permissions", "holders"] as const;

export function RolesList() {
  const roles = useRoles();
  const sort = useSortParam(SORTS);

  return (
    <DataTable
      aria-label="Roles"
      columns={COLUMNS}
      rows={roles.data ?? []}
      rowKey={(role) => role.id}
      sort={sort}
      loading={roles.isPending}
      skeletonRows={4}
      error={
        roles.isError ? (
          <ErrorState error={roles.error} onRetry={() => void roles.refetch()} />
        ) : undefined
      }
      empty={<EmptyState icon={ShieldCheck} title="No roles defined" />}
    />
  );
}
