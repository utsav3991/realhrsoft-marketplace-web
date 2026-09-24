"use client";

import { Gift, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import { Input } from "@/design-system/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/primitives/table";
import { useSelectedOrganizationId } from "@/shared/auth";
import { EmployerPermission, useCanInOrganization } from "@/shared/authorization";
import { StatusBadge } from "@/shared/components/status-badge";
import { ListSkeleton } from "@/shared/feedback/list-skeleton";
import { ErrorState } from "@/shared/feedback/states";
import { formatDate } from "@/shared/lib/format";

import { useBenefits, type BenefitStatus, type BenefitType } from "../api/benefits";
import { BENEFIT_TYPES, benefitTypeLabel } from "../schemas/benefit";

const FILTERS: { value: BenefitStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "retired", label: "Retired" },
];

// Radix Select cannot hold an empty value, so "all types" has its own sentinel.
const ALL_TYPES = "all";

function parseStatus(value: string | null): BenefitStatus | undefined {
  return FILTERS.find((filter) => filter.value === value)?.value;
}

function parseType(value: string | null): BenefitType | undefined {
  return BENEFIT_TYPES.find((type) => type.value === value)?.value;
}

function validity(from: string | null, until: string | null): string {
  if (!from && !until) return "Always";
  return `${from ? formatDate(from) : "Now"} – ${until ? formatDate(until) : "no end"}`;
}

export function BenefitsList() {
  const organizationId = useSelectedOrganizationId();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = parseStatus(searchParams.get("status"));
  const type = parseType(searchParams.get("type"));
  const q = searchParams.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const benefits = useBenefits(organizationId, { status, type, q });
  const canCreate = useCanInOrganization(EmployerPermission.BENEFIT_CREATE);
  const rows = benefits.data?.pages.flatMap((page) => page.items) ?? [];

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={onSearch} role="search" className="flex w-full max-w-sm gap-2">
          <Input
            type="search"
            maxLength={150}
            placeholder="Search by title"
            aria-label="Search benefits by title"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" variant="outline" size="icon" aria-label="Search">
            <Search aria-hidden />
          </Button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Filter by status" className="flex gap-1">
            {FILTERS.map((filter) => (
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
          <Select
            value={type ?? ALL_TYPES}
            onValueChange={(value) => updateUrl({ type: value === ALL_TYPES ? undefined : value })}
          >
            <SelectTrigger className="w-36" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TYPES}>All types</SelectItem>
              {BENEFIT_TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCreate ? (
            <Button asChild>
              <Link href="/employer/benefits/new">
                <Plus aria-hidden />
                New benefit
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {benefits.isPending ? (
        <ListSkeleton />
      ) : benefits.isError ? (
        <ErrorState error={benefits.error} onRetry={() => void benefits.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No benefits yet"
          description={
            q || status || type
              ? "Try a different search or filter."
              : "Create a draft, then publish it."
          }
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benefit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((benefit) => (
                <TableRow key={benefit.id}>
                  <TableCell>
                    <Link
                      href={`/employer/benefits/${benefit.id}`}
                      className="font-medium hover:underline"
                    >
                      {benefit.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {benefitTypeLabel(benefit.benefit_type)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge domain="benefit" status={benefit.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {validity(benefit.valid_from, benefit.valid_until)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(benefit.updated_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {benefits.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void benefits.fetchNextPage()}
            disabled={benefits.isFetchingNextPage}
          >
            {benefits.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
