"use client";

import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import { Input } from "@/design-system/primitives/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/primitives/table";
import { OrganizationAdminPermission, useCan } from "@/shared/authorization";
import { FieldsDialog } from "@/shared/components/fields-dialog";
import { ListSkeleton } from "@/shared/feedback/list-skeleton";
import { ErrorState } from "@/shared/feedback/states";
import { formatDate, formatDateTime } from "@/shared/lib/format";

import { useCreateOrganization } from "../api/mutations";
import { useOrganizations } from "../api/queries";

const NAME_FIELD = [{ name: "name", label: "Name", maxLength: 255 }] as const;

/** Search lives in the URL, so a filtered view can be shared and reloaded. */
export function OrganizationsDirectory() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const [draft, setDraft] = useState(search);
  const [creating, setCreating] = useState(false);
  const organizations = useOrganizations(search);
  const create = useCreateOrganization();
  const canCreate = useCan(OrganizationAdminPermission.ORGANIZATION_MANAGE);

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (draft.trim()) params.set("search", draft.trim());
    else params.delete("search");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const rows = organizations.data?.pages.flatMap((page) => page.results) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={onSearch} role="search" className="flex w-full max-w-sm gap-2">
          <Input
            type="search"
            maxLength={255}
            placeholder="Search by name"
            aria-label="Search organizations by name"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" variant="outline" size="icon" aria-label="Search">
            <Search aria-hidden />
          </Button>
        </form>
        {canCreate ? (
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            New organization
          </Button>
        ) : null}
      </div>

      {organizations.isPending ? (
        <ListSkeleton />
      ) : organizations.isError ? (
        <ErrorState error={organizations.error} onRetry={() => void organizations.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations found"
          description={search ? "Try a different search." : undefined}
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((organization) => (
                <TableRow key={organization.id}>
                  <TableCell>
                    <Link
                      href={`/admin/organizations/${organization.id}`}
                      className="font-medium hover:underline"
                    >
                      {organization.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(organization.created_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(organization.updated_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {organizations.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void organizations.fetchNextPage()}
            disabled={organizations.isFetchingNextPage}
          >
            {organizations.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}

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
