"use client";

import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import { OrganizationAdminPermission, useCan } from "@/shared/authorization";
import { FieldsDialog } from "@/shared/components/fields-dialog";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { SearchField } from "@/shared/components/search-field";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatDate, formatDateTime } from "@/shared/lib/format";

import { useCreateOrganization } from "../api/mutations";
import { ORGANIZATION_SORTS, useOrganizations } from "../api/queries";

const NAME_FIELD = [{ name: "name", label: "Name", maxLength: 255 }] as const;

/** Search lives in the URL, so a filtered view can be shared and reloaded. */
export function OrganizationsDirectory() {
  const router = useRouter();
  const { searchParams } = useUrlParams();
  const search = searchParams.get("search") ?? "";
  const [creating, setCreating] = useState(false);
  const sort = useSortParam(ORGANIZATION_SORTS);
  const paging = usePageParam();
  const organizations = useOrganizations({ search, ordering: sort.value }, paging);
  const create = useCreateOrganization();
  const canCreate = useCan(OrganizationAdminPermission.ORGANIZATION_MANAGE);

  const columns: DataTableColumns<RowOf<typeof organizations>> = [
    {
      id: "organization",
      sortKey: "name",
      header: "Organization",
      cell: (organization) => (
        <Link
          href={`/admin/organizations/${organization.id}`}
          className="font-medium hover:underline"
        >
          {organization.name}
        </Link>
      ),
    },
    {
      id: "created",
      sortKey: "created_at",
      header: "Created",
      cellClassName: "text-muted-foreground",
      cell: (organization) => formatDate(organization.created_at),
    },
    {
      id: "updated",
      sortKey: "updated_at",
      header: "Last updated",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (organization) => formatDateTime(organization.updated_at),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchField
          placeholder="Search by name"
          aria-label="Search organizations by name"
          className="max-w-sm"
        />
        {canCreate ? (
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            New organization
          </Button>
        ) : null}
      </div>

      <QueryDataTable
        aria-label="Organizations"
        query={organizations}
        columns={columns}
        sort={sort}
        paging={paging}
        rowKey={(organization) => organization.id}
        empty={
          <EmptyState
            icon={Building2}
            title="No organizations found"
            description={search ? "Try a different search." : undefined}
          />
        }
      />

      <FieldsDialog
        open={creating}
        onOpenChange={setCreating}
        title="New organization"
        description="Creates the organization identity only. It grants no membership, roles, or Employer or Partner capacity."
        confirmLabel="Create organization"
        fields={NAME_FIELD}
        onConfirm={async ({ name, reason }) => {
          const { id } = await create.mutateAsync({ name: name ?? "", reason });
          toast.success(`Created ${name}`);
          router.push(`/admin/organizations/${id}`);
        }}
      />
    </div>
  );
}
