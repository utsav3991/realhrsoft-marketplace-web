"use client";

import { Handshake, Plus } from "lucide-react";
import Link from "next/link";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Button } from "@/design-system/primitives/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Badge } from "@/design-system/primitives/badge";
import { BUSINESS_KIND_LABEL } from "@/features/offers/schemas/offer";
import {
  IdentityPermission,
  OrganizationAdminPermission,
  PartnerAdminPermission,
  useCan,
} from "@/shared/authorization";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { SearchField } from "@/shared/components/search-field";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDateTime } from "@/shared/lib/format";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";

import {
  PARTNER_SORTS,
  usePartners,
  type IntakePath,
  type PartnerKind,
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
const KINDS = Object.keys(BUSINESS_KIND_LABEL) as PartnerKind[];
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
  const kind = oneOf(searchParams.get("kind"), KINDS);
  const intakePath = oneOf(searchParams.get("intake_path"), INTAKE_PATHS);
  const source = oneOf(searchParams.get("source"), SOURCES);
  const sort = useSortParam(PARTNER_SORTS);
  const paging = usePageParam();
  const partners = usePartners(
    { search, kind, status, intakePath, source, ordering: sort.value },
    paging,
  );
  const canCreate = useCan(PartnerAdminPermission.PARTNER_CREATE);
  // Onboarding also creates the administrator's seat: admission plus a role grant.
  const canAdmit = useCan(OrganizationAdminPermission.MEMBERSHIP_MANAGE);
  const canGrant = useCan(IdentityPermission.ORGANIZATION_ROLE_MANAGE);
  const canOnboard = canCreate && canAdmit && canGrant;

  function setParam(name: string, value: string | null) {
    set({ [name]: value });
  }

  const columns: DataTableColumns<RowOf<typeof partners>> = [
    {
      id: "business",
      sortKey: "business_name",
      header: "Business",
      cell: (partner) => (
        <span className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/partners/${partner.id}`} className="font-medium hover:underline">
            {partner.business_name}
          </Link>
          <Badge intent={partner.kind === "client" ? "neutral" : "outline"}>
            {BUSINESS_KIND_LABEL[partner.kind]}
          </Badge>
        </span>
      ),
    },
    {
      id: "organization",
      sortKey: "organization_name",
      header: "Organization",
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (partner) => partner.organization_name ?? "Client group",
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
  const filtered = Boolean(search || kind || status || intakePath || source);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            placeholder="Search business or organization"
            aria-label="Search partners by business or organization name"
            className="max-w-sm"
          />
          <Select
            value={kind ?? ALL}
            onValueChange={(value) => setParam("kind", value === ALL ? null : value)}
          >
            <SelectTrigger className="w-40" aria-label="Filter by kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Clients and merchants</SelectItem>
              {KINDS.map((option) => (
                <SelectItem key={option} value={option}>
                  {BUSINESS_KIND_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="flex flex-wrap gap-2">
          {canCreate ? (
            <Button asChild variant={canOnboard ? "outline" : "default"}>
              <Link href="/admin/partners/new">
                <Plus aria-hidden />
                Register partner
              </Link>
            </Button>
          ) : null}
          {canOnboard ? (
            <Button asChild>
              <Link href="/admin/merchants/new">
                <Plus aria-hidden />
                Onboard merchant
              </Link>
            </Button>
          ) : null}
        </div>
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
