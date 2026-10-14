"use client";

import { ArrowLeft, BriefcaseBusiness, Ticket, X } from "lucide-react";
import Link from "next/link";

import type { DataTableColumn, DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ApiError, isUuid } from "@/shared/api";
import {
  ClaimAdminPermission,
  OrganizationAdminPermission,
  PartnerAdminPermission,
  useCan,
} from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { QueryDataTable } from "@/shared/components/query-data-table";
import { SearchField } from "@/shared/components/search-field";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { OrganizationFilter } from "@/features/organizations/components/organization-filter";

import { EMPLOYMENT_SORTS, useEmployment, useEmployments, type Employment } from "../api/queries";

const ALL = "all";
const CURRENT_FILTERS = [
  { value: "current", label: "Current", isCurrent: true },
  { value: "ended", label: "Ended", isCurrent: false },
] as const;

const employmentStatus = (employment: Employment) => (employment.is_current ? "current" : "ended");

/** The employee as synchronized from RealHRSoft: name, with the email beneath when sent. */
function EmployeeName({ employment, link }: { employment: Employment; link?: boolean }) {
  const name = employment.employee_name || employment.employee_email || "Unnamed employee";
  return (
    <>
      {link ? (
        <Link href={`/admin/employments/${employment.id}`} className="font-medium hover:underline">
          {name}
        </Link>
      ) : (
        <span className="font-medium">{name}</span>
      )}
      {employment.employee_email && employment.employee_name ? (
        <span className="text-muted-foreground block text-xs">{employment.employee_email}</span>
      ) : null}
    </>
  );
}

/** Every employment; search, status and id filters live in the URL. */
const STATUS_COLUMN: DataTableColumn<Employment> = {
  id: "status",
  header: "Status",
  cell: (employment) => <StatusBadge domain="employment" status={employmentStatus(employment)} />,
};

const STARTED_COLUMN: DataTableColumn<Employment> = {
  id: "started",
  header: "Started",
  sortKey: "started_at",
  cellClassName: "text-muted-foreground",
  cell: (employment) => formatDate(employment.started_at),
};

const ENDED_COLUMN: DataTableColumn<Employment> = {
  id: "ended",
  header: "Ended",
  sortKey: "ended_at",
  cellClassName: "text-muted-foreground",
  cell: (employment) => (employment.ended_at ? formatDate(employment.ended_at) : "—"),
};

export function EmploymentsDirectory() {
  const { searchParams, set } = useUrlParams();
  const search = searchParams.get("search") ?? "";
  const current = CURRENT_FILTERS.find((f) => f.value === searchParams.get("status")) ?? null;
  const employeeParam = searchParams.get("employee_id");
  const organizationParam = searchParams.get("organization_id");
  const employeeId = employeeParam && isUuid(employeeParam) ? employeeParam : null;
  const organizationId = organizationParam && isUuid(organizationParam) ? organizationParam : null;
  const sort = useSortParam(EMPLOYMENT_SORTS);
  const paging = usePageParam();
  const employments = useEmployments(
    {
      search,
      isCurrent: current?.isCurrent ?? null,
      employeeId,
      organizationId,
      ordering: sort.value,
    },
    paging,
  );
  const canViewOrganizations = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);

  function setParam(name: string, value: string | null) {
    set({ [name]: value });
  }

  const filtered = Boolean(search || current || employeeId || organizationId);
  const columns: DataTableColumns<Employment> = [
    {
      id: "employee",
      header: "Employee",
      sortKey: "employee_name",
      cell: (employment) => <EmployeeName employment={employment} link />,
    },
    {
      id: "employer",
      header: "Employer",
      sortKey: "organization_name",
      cell: (employment) =>
        canViewOrganizations ? (
          <Link
            href={`/admin/organizations/${employment.organization_id}`}
            className="hover:underline"
          >
            {employment.organization_name}
          </Link>
        ) : (
          employment.organization_name
        ),
    },
    STATUS_COLUMN,
    STARTED_COLUMN,
    ENDED_COLUMN,
  ];
  // The employer has its own picker; an employee is linked to from employment records.
  const idFilters = [{ param: "employee_id", label: "Employee", value: employeeId }].filter(
    (f) => f.value,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            placeholder="Search employee name or email"
            aria-label="Search employments by employee name or email"
            className="max-w-sm"
          />
          <Select
            value={current?.value ?? ALL}
            onValueChange={(value) => setParam("status", value === ALL ? null : value)}
          >
            <SelectTrigger className="w-40" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {CURRENT_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <OrganizationFilter
            label="Employer"
            allLabel="All employers"
            value={organizationId}
            onChange={(id) => setParam("organization_id", id)}
          />
          {idFilters.map((f) => (
            <Badge key={f.param} intent="outline" className="gap-1.5 py-1.5 pr-1.5">
              {f.label}: <span className="font-mono">{f.value?.slice(0, 8)}…</span>
              <button
                type="button"
                className="hover:bg-secondary rounded-full p-0.5"
                aria-label={`Clear ${f.label.toLowerCase()} filter`}
                onClick={() => setParam(f.param, null)}
              >
                <X aria-hidden />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <QueryDataTable
        aria-label="Employments"
        query={employments}
        columns={columns}
        sort={sort}
        paging={paging}
        rowKey={(employment) => employment.id}
        empty={
          <EmptyState
            icon={BriefcaseBusiness}
            title="No employments found"
            description={
              filtered
                ? "Try different filters."
                : "Employments arrive from RealHRSoft synchronization."
            }
          />
        }
      />
    </div>
  );
}

function BackToEmployments() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/admin/employments">
        <ArrowLeft aria-hidden />
        Employments
      </Link>
    </Button>
  );
}

export function EmploymentRecord({ employmentId }: { employmentId: string }) {
  const employment = useEmployment(employmentId);

  if (employment.isPending) {
    return (
      <div className="space-y-6">
        <BackToEmployments />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (employment.isError) {
    return (
      <div className="space-y-6">
        <BackToEmployments />
        {employment.error instanceof ApiError && employment.error.isNotFound ? (
          <EmptyState icon={BriefcaseBusiness} title="Employment not found" />
        ) : (
          <ErrorState error={employment.error} onRetry={() => void employment.refetch()} />
        )}
      </div>
    );
  }
  return <LoadedEmployment employment={employment.data} />;
}

function LoadedEmployment({ employment }: { employment: Employment }) {
  const canViewOrganizations = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const canViewClaims = useCan(ClaimAdminPermission.CLAIM_VIEW);
  return (
    <div className="space-y-6">
      <BackToEmployments />
      <PageHeader
        title={employment.employee_name || employment.employee_email || "Unnamed employee"}
        description={`Employed by ${employment.organization_name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="employment" status={employmentStatus(employment)} />
            {canViewClaims ? (
              <Button asChild variant="outline">
                <Link href={`/admin/claims?employer_id=${employment.organization_id}`}>
                  <Ticket aria-hidden />
                  Employer&apos;s claims
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={`/admin/employments?employee_id=${employment.employee_id}`}>
                <BriefcaseBusiness aria-hidden />
                All employments
              </Link>
            </Button>
          </div>
        }
      />
      <EmploymentDetails employment={employment} canViewOrganizations={canViewOrganizations} />
    </div>
  );
}

function EmploymentDetails({
  employment,
  canViewOrganizations,
}: {
  employment: Employment;
  canViewOrganizations: boolean;
}) {
  const canViewPartners = useCan(PartnerAdminPermission.PARTNER_VIEW);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Employment</CardTitle>
        <CardDescription>
          {employment.is_current
            ? "Synchronized from RealHRSoft. The employee may use offers and benefits for this company."
            : "Ended by RealHRSoft. The employee keeps their claim history but can no longer claim for this company."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Employee">
            <EmployeeName employment={employment} />
          </Detail>
          <Detail label="RealHRSoft employee">
            <span className="font-mono text-xs">{employment.employee_external_id}</span>
          </Detail>
          <Detail label="Employer">
            {canViewOrganizations ? (
              <Link
                href={`/admin/organizations/${employment.organization_id}`}
                className="hover:underline"
              >
                {employment.organization_name}
              </Link>
            ) : (
              employment.organization_name
            )}
          </Detail>
          <Detail label="Client">
            {canViewPartners ? (
              <Link href={`/admin/partners/${employment.partner_id}`} className="hover:underline">
                View client
              </Link>
            ) : (
              <span className="font-mono text-xs">{employment.partner_id}</span>
            )}
          </Detail>
          <Detail label="Source">RealHRSoft synchronization</Detail>
          <Detail label="Started">{formatDateTime(employment.started_at)}</Detail>
          <Detail label="Started by">
            <span className="font-mono text-xs">{employment.started_by}</span>
          </Detail>
          <Detail label="Ended">
            {employment.ended_at ? formatDateTime(employment.ended_at) : "—"}
          </Detail>
          {employment.ended_by ? (
            <Detail label="Ended by">
              <span className="font-mono text-xs">{employment.ended_by}</span>
            </Detail>
          ) : null}
          {employment.end_reason ? (
            <Detail label="End reason" className="sm:col-span-2 lg:col-span-3">
              <span className="whitespace-pre-line">{employment.end_reason}</span>
            </Detail>
          ) : null}
          <Detail label="Version">{employment.version}</Detail>
        </DetailList>
      </CardContent>
    </Card>
  );
}
