"use client";

import { Search, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import { Input } from "@/design-system/primitives/input";
import { Skeleton } from "@/design-system/primitives/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/primitives/table";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { formatPersonName } from "@/shared/lib/format";

import { useUsers, type UserStatusFilter } from "../api/queries";
import { NewUserAction } from "./new-user-action";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = parseStatus(searchParams.get("status"));
  const q = searchParams.get("q") ?? "";
  const [draft, setDraft] = useState(q);

  const users = useUsers({ status, q });

  function updateUrl(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateUrl({ q: draft.trim() || undefined });
  }

  const rows = users.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={onSearch} role="search" className="flex w-full max-w-sm gap-2">
          <Input
            type="search"
            maxLength={320}
            placeholder="Search by email"
            aria-label="Search users by email"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" variant="outline" size="icon" aria-label="Search">
            <Search aria-hidden />
          </Button>
        </form>
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

      {users.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : users.isError ? (
        <ErrorState error={users.error} onRetry={() => void users.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description={q || status ? "Try a different search or filter." : undefined}
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Actor type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Link href={`/admin/users/${user.id}`} className="font-medium hover:underline">
                      {user.email}
                    </Link>
                  </TableCell>
                  <TableCell>{formatPersonName(user.first_name, user.last_name)}</TableCell>
                  <TableCell className="text-muted-foreground">{user.actor_type}</TableCell>
                  <TableCell>
                    <StatusBadge domain="user" status={user.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {users.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void users.fetchNextPage()}
            disabled={users.isFetchingNextPage}
          >
            {users.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
