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
import { StatusBadge } from "@/shared/components/status-badge";
import { ListSkeleton } from "@/shared/feedback/list-skeleton";
import { ErrorState } from "@/shared/feedback/states";
import { formatDate } from "@/shared/lib/format";

import { useCreateOrganization } from "../api/mutations";
import { useOrganizations } from "../api/queries";

const NAME_FIELD = [{ name: "name", label: "Name", maxLength: 200 }] as const;

/** Search lives in the URL, so a filtered view can be shared and reloaded. */
export function OrganizationsDirectory() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const [creating, setCreating] = useState(false);
  const organizations = useOrganizations(q);
  const create = useCreateOrganization();
  const canCreate = useCan(OrganizationAdminPermission.ORGANIZATION_MANAGE);

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (draft.trim()) params.set("q", draft.trim());
    else params.delete("q");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const rows = organizations.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={onSearch} role="search" className="flex w-full max-w-sm gap-2">
          <Input
            type="search"
            maxLength={200}
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
          description={q ? "Try a different search." : undefined}
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Capacities</TableHead>
                <TableHead>Created</TableHead>
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
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {organization.employer_status ? (
                        <StatusBadge
                          domain="employerProfile"
                          status={organization.employer_status}
                        />
                      ) : null}
                      {organization.partner_status ? (
                        <StatusBadge domain="partnerProfile" status={organization.partner_status} />
                      ) : null}
                      {!organization.employer_status && !organization.partner_status ? (
                        <span className="text-muted-foreground text-sm">None</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(organization.created_at)}
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
        description="An organization has no capacities until you enable the Employer profile or verify a Partner application for it."
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
