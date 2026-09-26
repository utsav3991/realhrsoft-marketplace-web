"use client";

import { ArrowLeft, BriefcaseBusiness, Plus, Search, Ticket, X } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

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
import { Input } from "@/design-system/primitives/input";
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
  EmploymentAdminPermission,
  IdentityPermission,
  OrganizationAdminPermission,
  useCan,
} from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { QueryDataTable, resultRows } from "@/shared/components/query-data-table";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { OrganizationFilter } from "@/features/organizations/components/organization-filter";

import { useEndEmployment } from "../api/mutations";
import { EMPLOYMENT_SORTS, useEmployment, useEmployments, type Employment } from "../api/queries";
import { StartEmploymentDialog } from "./start-employment-dialog";

const ALL = "all";
const CURRENT_FILTERS = [
  { value: "current", label: "Current", isCurrent: true },
  { value: "ended", label: "Ended", isCurrent: false },
] as const;

const employmentStatus = (employment: Employment) => (employment.is_current ? "current" : "ended");

/** Starts an employment; hidden without employee_access.employment.create. */
export function StartEmploymentAction({
  employee,
  size,
}: {
  employee?: { id: string; label: string };
  size?: "sm";
}) {
  const [open, setOpen] = useState(false);
  if (!useCan(EmploymentAdminPermission.EMPLOYMENT_CREATE)) return null;
  return (
    <>
      <Button size={size} variant={size ? "outline" : "default"} onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Start employment
      </Button>
      <StartEmploymentDialog open={open} onOpenChange={setOpen} employee={employee} />
    </>
  );
}

/** Ends a current employment; hidden without employee_access.employment.end. */
function EndEmploymentAction({ employment, size }: { employment: Employment; size?: "sm" }) {
  const [open, setOpen] = useState(false);
  const end = useEndEmployment(employment.id);
  const canEnd = useCan(EmploymentAdminPermission.EMPLOYMENT_END);
  if (!canEnd || !employment.is_current) return null;
  return (
    <>
      <Button size={size} variant={size ? "ghost" : "destructive"} onClick={() => setOpen(true)}>
        End employment
      </Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="End this employment?"
        description={`${employment.user_email} immediately loses marketplace browsing and claiming through ${employment.organization_name}. Their claims are kept, and partners can still confirm active ones until they expire.`}
        confirmLabel="End employment"
        destructive
        onConfirm={async (reason) => {
          await end.mutateAsync({ expected_version: employment.version, reason });
          toast.success(`Employment of ${employment.user_email} ended`);
        }}
      />
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

const EMPLOYER_HISTORY_COLUMNS: DataTableColumns<Employment> = [
  {
    id: "employer",
    header: "Employer",
    sortKey: "organization_name",
    cell: (employment) => (
      <Link href={`/admin/employments/${employment.id}`} className="font-medium hover:underline">
        {employment.organization_name}
      </Link>
    ),
  },
  STATUS_COLUMN,
  STARTED_COLUMN,
  ENDED_COLUMN,
];

export function EmploymentsDirectory() {
  const { searchParams, set } = useUrlParams();
  const search = searchParams.get("search") ?? "";
  const current = CURRENT_FILTERS.find((f) => f.value === searchParams.get("status")) ?? null;
  const userParam = searchParams.get("user_id");
  const organizationParam = searchParams.get("organization_id");
  const userId = userParam && isUuid(userParam) ? userParam : null;
  const organizationId = organizationParam && isUuid(organizationParam) ? organizationParam : null;
  const [draft, setDraft] = useState(search);
  const sort = useSortParam(EMPLOYMENT_SORTS);
  const paging = usePageParam();
  const employments = useEmployments(
    { search, isCurrent: current?.isCurrent ?? null, userId, organizationId, ordering: sort.value },
    paging,
  );
  const canViewUsers = useCan(IdentityPermission.USER_VIEW);
  const canViewOrganizations = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const canEnd = useCan(EmploymentAdminPermission.EMPLOYMENT_END);

  function setParam(name: string, value: string | null) {
    set({ [name]: value });
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParam("search", draft.trim() || null);
  }

  const filtered = Boolean(search || current || userId || organizationId);
  const columns: DataTableColumns<Employment> = [
    {
      id: "employee",
      header: "Employee",
      sortKey: "user_email",
      cell: (employment) => (
        <>
          <Link
            href={`/admin/employments/${employment.id}`}
            className="font-medium hover:underline"
          >
            {employment.user_email}
          </Link>
          {canViewUsers ? (
            <Link
              href={`/admin/users/${employment.user_id}`}
              className="text-muted-foreground block text-xs hover:underline"
            >
              User account
            </Link>
          ) : null}
        </>
      ),
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
    canEnd && {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (employment) => <EndEmploymentAction employment={employment} size="sm" />,
    },
  ];
  // The employer has its own picker; an employee is linked to from user pages.
  const idFilters = [{ param: "user_id", label: "Employee", value: userId }].filter((f) => f.value);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={onSearch} role="search" className="flex w-full max-w-sm gap-2">
            <Input
              type="search"
              maxLength={254}
              placeholder="Search employee email"
              aria-label="Search employments by employee email"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button type="submit" variant="outline" size="icon" aria-label="Search">
              <Search aria-hidden />
            </Button>
          </form>
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
        <StartEmploymentAction />
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
                : "Start an employment to let an employee account use the marketplace."
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
  const canViewUsers = useCan(IdentityPermission.USER_VIEW);
  const canViewOrganizations = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const canViewClaims = useCan(ClaimAdminPermission.CLAIM_VIEW);
  return (
    <div className="space-y-6">
      <BackToEmployments />
      <PageHeader
        title={employment.user_email}
        description={`Employed by ${employment.organization_name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="employment" status={employmentStatus(employment)} />
            {canViewClaims ? (
              <Button asChild variant="outline">
                <Link href={`/admin/claims?employee_id=${employment.user_id}`}>
                  <Ticket aria-hidden />
                  Claims
                </Link>
              </Button>
            ) : null}
            <EndEmploymentAction employment={employment} />
          </div>
        }
      />
      <EmploymentDetails
        employment={employment}
        canViewUsers={canViewUsers}
        canViewOrganizations={canViewOrganizations}
      />
    </div>
  );
}

function EmploymentDetails({
  employment,
  canViewUsers,
  canViewOrganizations,
}: {
  employment: Employment;
  canViewUsers: boolean;
  canViewOrganizations: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Employment</CardTitle>
        <CardDescription>
          {employment.is_current
            ? "The employee may browse and claim offers targeted at this employer."
            : "Ended. The employee keeps their claim history but can no longer browse or claim."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DetailList>
          <Detail label="Employee">
            {canViewUsers ? (
              <Link href={`/admin/users/${employment.user_id}`} className="hover:underline">
                {employment.user_email}
              </Link>
            ) : (
              employment.user_email
            )}
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
          <Detail label="Source">
            {employment.source === "manual" ? "Recorded by an administrator" : employment.source}
          </Detail>
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

/**
 * An employee account's employments, on its user page. Only employee accounts can be
 * employed, so the card is offered for them alone; the API still decides every action.
 */
export function UserEmploymentsCard({ userId, email }: { userId: string; email: string }) {
  const canView = useCan(EmploymentAdminPermission.EMPLOYMENT_VIEW);
  const canViewClaims = useCan(ClaimAdminPermission.CLAIM_VIEW);
  const sort = useSortParam(EMPLOYMENT_SORTS, "employments_ordering");
  const paging = usePageParam("employments_");
  const employments = useEmployments(
    { search: "", isCurrent: null, userId, organizationId: null, ordering: sort.value },
    paging,
    { enabled: canView },
  );
  if (!canView) return null;

  const hasCurrent = resultRows(employments).some((employment) => employment.is_current);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Employment</CardTitle>
          <CardDescription>
            A current employment lets this employee use the marketplace.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {canViewClaims ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/claims?employee_id=${userId}`}>
                <Ticket aria-hidden />
                Claims
              </Link>
            </Button>
          ) : null}
          {employments.isSuccess && !hasCurrent ? (
            <StartEmploymentAction employee={{ id: userId, label: email }} size="sm" />
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <QueryDataTable
          aria-label="Employment history"
          query={employments}
          columns={EMPLOYER_HISTORY_COLUMNS}
          sort={sort}
          paging={paging}
          rowKey={(employment) => employment.id}
          skeletonRows={2}
          className="rounded-lg"
          empty={
            <EmptyState
              icon={BriefcaseBusiness}
              title="No employment recorded"
              description="Start one to let this employee browse and claim offers."
              className="py-8"
            />
          }
        />
      </CardContent>
    </Card>
  );
}
