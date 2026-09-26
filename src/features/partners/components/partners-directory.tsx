"use client";

import { Handshake, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { type DataTableColumns } from "@/design-system/components/data-table";
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
import { PartnerAdminPermission, useCan } from "@/shared/authorization";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDateTime } from "@/shared/lib/format";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";

import {
  PARTNER_SORTS,
  usePartners,
  type IntakePath,
  type PartnerSource,
  type PartnerStatus,
} from "../api/queries";
import { INTAKE_LABEL, SOURCE_LABEL } from "./partner-details";

const ALL = "all";
const STATUSES: readonly { value: PartnerStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];
const INTAKE_PATHS = Object.keys(INTAKE_LABEL) as IntakePath[];
const SOURCES = Object.keys(SOURCE_LABEL) as PartnerSource[];

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return allowed.find((candidate) => candidate === value) ?? null;
}

/** Filters and search live in the URL, so the review queue can be shared and reloaded. */
export function PartnersDirectory() {
  const { searchParams, set } = useUrlParams();
  const search = searchParams.get("search") ?? "";
  const status = oneOf(
    searchParams.get("status"),
    STATUSES.map((s) => s.value),
  );
  const intakePath = oneOf(searchParams.get("intake_path"), INTAKE_PATHS);
  const source = oneOf(searchParams.get("source"), SOURCES);
  const [draft, setDraft] = useState(search);
  const sort = useSortParam(PARTNER_SORTS);
  const paging = usePageParam();
  const partners = usePartners(
    { search, status, intakePath, source, ordering: sort.value },
    paging,
  );
  const canCreate = useCan(PartnerAdminPermission.PARTNER_CREATE);

  function setParam(name: string, value: string | null) {
    set({ [name]: value });
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParam("search", draft.trim() || null);
  }

  const columns: DataTableColumns<RowOf<typeof partners>> = [
    {
      id: "business",
      sortKey: "business_name",
      header: "Business",
      cell: (partner) => (
        <Link href={`/admin/partners/${partner.id}`} className="font-medium hover:underline">
          {partner.business_name}
        </Link>
      ),
    },
    {
      id: "organization",
      sortKey: "organization_name",
      header: "Organization",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (partner) => partner.organization_name,
    },
    {
      id: "status",
      header: "Status",
      cell: (partner) => <StatusBadge domain="partner" status={partner.status} />,
    },
    {
      id: "type",
      header: "Type",
      cellClassName: "text-muted-foreground",
      cell: (partner) => SOURCE_LABEL[partner.source],
    },
    {
      id: "intake",
      header: "Intake",
      className: "hidden lg:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (partner) => INTAKE_LABEL[partner.intake_path],
    },
    {
      id: "submitted",
      sortKey: "submitted_at",
      header: "Submitted",
      cellClassName: "text-muted-foreground",
      cell: (partner) => formatDateTime(partner.submitted_at),
    },
  ];
  const filtered = Boolean(search || status || intakePath || source);

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
          <Select
            value={source ?? ALL}
            onValueChange={(value) => setParam("source", value === ALL ? null : value)}
          >
            <SelectTrigger className="w-52" aria-label="Filter by partner type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any partner type</SelectItem>
              {SOURCES.map((option) => (
                <SelectItem key={option} value={option}>
                  {SOURCE_LABEL[option]}
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

      <QueryDataTable
        aria-label="Partners"
        query={partners}
        columns={columns}
        sort={sort}
        paging={paging}
        rowKey={(partner) => partner.id}
        empty={
          <EmptyState
            icon={Handshake}
            title={status === "pending" ? "Nothing awaiting review" : "No partners found"}
            description={filtered ? "Try different filters." : undefined}
          />
        }
      />
    </div>
  );
}
