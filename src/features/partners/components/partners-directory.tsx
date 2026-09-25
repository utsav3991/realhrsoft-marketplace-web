"use client";

import { Handshake, Plus, Search } from "lucide-react";
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
import { PartnerAdminPermission, useCan } from "@/shared/authorization";
import { StatusBadge } from "@/shared/components/status-badge";
import { ListSkeleton } from "@/shared/feedback/list-skeleton";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";

import { usePartners, type IntakePath, type PartnerStatus } from "../api/queries";
import { INTAKE_LABEL } from "./partner-details";

const ALL = "all";
const STATUSES: readonly { value: PartnerStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];
const INTAKE_PATHS = Object.keys(INTAKE_LABEL) as IntakePath[];

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return allowed.find((candidate) => candidate === value) ?? null;
}

/** Filters and search live in the URL, so the review queue can be shared and reloaded. */
export function PartnersDirectory() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const status = oneOf(
    searchParams.get("status"),
    STATUSES.map((s) => s.value),
  );
  const intakePath = oneOf(searchParams.get("intake_path"), INTAKE_PATHS);
  const [draft, setDraft] = useState(search);
  const partners = usePartners({ search, status, intakePath });
  const canCreate = useCan(PartnerAdminPermission.PARTNER_CREATE);

  function setParam(name: string, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(name, value);
    else params.delete(name);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParam("search", draft.trim() || null);
  }

  const rows = partners.data?.pages.flatMap((page) => page.results) ?? [];
  const filtered = Boolean(search || status || intakePath);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={onSearch} role="search" className="flex w-full max-w-sm gap-2">
            <Input
              type="search"
              maxLength={255}
              placeholder="Search business or organization"
              aria-label="Search partners by business or organization name"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button type="submit" variant="outline" size="icon" aria-label="Search">
              <Search aria-hidden />
            </Button>
          </form>
          <Select
            value={status ?? ALL}
            onValueChange={(value) => setParam("status", value === ALL ? null : value)}
          >
            <SelectTrigger className="w-40" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUSES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={intakePath ?? ALL}
            onValueChange={(value) => setParam("intake_path", value === ALL ? null : value)}
          >
            <SelectTrigger className="w-48" aria-label="Filter by intake">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any intake</SelectItem>
              {INTAKE_PATHS.map((path) => (
                <SelectItem key={path} value={path}>
                  {INTAKE_LABEL[path]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/admin/partners/new">
              <Plus aria-hidden />
              Register partner
            </Link>
          </Button>
        ) : null}
      </div>

      {partners.isPending ? (
        <ListSkeleton />
      ) : partners.isError ? (
        <ErrorState error={partners.error} onRetry={() => void partners.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title={status === "pending" ? "Nothing awaiting review" : "No partners found"}
          description={filtered ? "Try different filters." : undefined}
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Intake</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell>
                    <Link
                      href={`/admin/partners/${partner.id}`}
                      className="font-medium hover:underline"
                    >
                      {partner.business_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {partner.organization_name}
                  </TableCell>
                  <TableCell>
                    <StatusBadge domain="partner" status={partner.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {INTAKE_LABEL[partner.intake_path]}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(partner.submitted_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {partners.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void partners.fetchNextPage()}
            disabled={partners.isFetchingNextPage}
          >
            {partners.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
