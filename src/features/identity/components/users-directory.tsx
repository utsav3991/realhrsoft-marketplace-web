"use client";

import { Users } from "lucide-react";
import Link from "next/link";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import type { Schemas } from "@/shared/api";
import { StatusBadge } from "@/shared/components/status-badge";
import { QueryDataTable } from "@/shared/components/query-data-table";
import { SearchField } from "@/shared/components/search-field";
import { formatPersonName } from "@/shared/lib/format";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { usePageParam } from "@/shared/hooks/use-page-param";

import { USER_SORTS, useUsers, type UserStatusFilter } from "../api/queries";
import { NewUserAction } from "./new-user-action";

const COLUMNS: DataTableColumns<Schemas["UserSummary"]> = [
  {
    id: "email",
    header: "Email",
    sortKey: "email",
    cell: (user) => (
      <Link href={`/admin/users/${user.id}`} className="font-medium hover:underline">
        {user.email}
      </Link>
    ),
  },
  {
    id: "name",
    header: "Name",
    cell: (user) => formatPersonName(user.first_name, user.last_name),
  },
  {
    id: "actor-type",
    header: "Actor type",
    className: "hidden md:table-cell",
    cellClassName: "text-muted-foreground",
    cell: (user) => user.actor_type,
  },
  {
    id: "status",
    header: "Status",
    cell: (user) => <StatusBadge domain="user" status={user.status} />,
  },
];

const STATUS_FILTERS: { value: UserStatusFilter | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
];

function parseStatus(value: string | null): UserStatusFilter | undefined {
  return value === "active" || value === "disabled" ? value : undefined;
}

/** Search and status filter live in the URL, so a filtered view can be shared and reloaded. */
export function UsersDirectory() {
  const { searchParams, set } = useUrlParams();
  const status = parseStatus(searchParams.get("status"));
  const q = searchParams.get("q") ?? "";

  const sort = useSortParam(USER_SORTS);
  const paging = usePageParam();
  const users = useUsers({ status, q, ordering: sort.value }, paging);

  function updateUrl(changes: Record<string, string | undefined>) {
    set(changes);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchField 
          paramName="q"
          placeholder="Search by email" 
          aria-label="Search users by email" 
          className="max-w-sm"
        />
        <div role="group" aria-label="Filter by status" className="flex gap-1">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.label}
              size="sm"
              variant={status === filter.value ? "secondary" : "ghost"}
              aria-pressed={status === filter.value}
              onClick={() => updateUrl({ status: filter.value })}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        <NewUserAction />
      </div>

      <QueryDataTable
        aria-label="Users"
        query={users}
        paging={paging}
        sort={sort}
        columns={COLUMNS}
        rowKey={(user) => user.id}
        empty={
          <EmptyState
            icon={Users}
            title="No users found"
            description={q || status ? "Try a different search or filter." : undefined}
          />
        }
      />
    </div>
  );
}
