"use client";

import { ArrowLeft, Gift, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
import { Button } from "@/design-system/primitives/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/design-system/primitives/tooltip";
import { ApiError, isUuid } from "@/shared/api";
import {
  BenefitAdminPermission,
  OrganizationAdminPermission,
  useCan,
} from "@/shared/authorization";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { SearchField } from "@/shared/components/search-field";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { OrganizationFilter } from "@/features/organizations/components/organization-filter";
import {
  OfferDecisionHistory,
  OfferVersionHistory,
} from "@/features/offers/components/offer-details";
import { formatDate } from "@/shared/lib/format";

import { useAdminBenefitAction, type AdminBenefitAction } from "../api/mutations";
import {
  BENEFIT_SORTS,
  useAdminBenefit,
  useAdminBenefitDecisions,
  useAdminBenefits,
  useAdminBenefitVersions,
  type Benefit,
} from "../api/queries";
import { benefitVersion } from "../schemas/benefit";
import {
  AvailabilityBadge,
  BENEFIT_STATUSES,
  BenefitContentCard,
  benefitStatusFrom,
  BenefitStatusCallout,
  isSuspended,
  LifecycleCard,
  validity,
} from "./benefit-details";

const ALL = "all";

/** Every employer's Company Benefits, for moderation. Filters live in the URL. */
export function AdminBenefits() {
  const { searchParams, set } = useUrlParams();
  const search = searchParams.get("search") ?? "";
  const status = benefitStatusFrom(searchParams.get("status"));
  const rawOrganization = searchParams.get("organization_id");
  const organizationId = rawOrganization && isUuid(rawOrganization) ? rawOrganization : null;
  const sort = useSortParam(BENEFIT_SORTS);
  const paging = usePageParam();
  const benefits = useAdminBenefits(
    { search, status, organizationId, ordering: sort.value },
    paging,
  );

  function setParam(name: string, value: string | null) {
    set({ [name]: value });
  }

  const filtered = Boolean(search || status || organizationId);

  const columns: DataTableColumns<RowOf<typeof benefits>> = [
    {
      id: "benefit",
      header: "Benefit",
      cell: (benefit) => (
        <Link
          href={`/admin/company-benefits/${benefit.id}`}
          className="font-medium hover:underline"
        >
          {benefitVersion(benefit)?.title ?? "Untitled benefit"}
        </Link>
      ),
    },
    {
      id: "employer",
      header: "Employer",
      cell: (benefit) => {
        const employer = benefit.provider_organization;
        if (!employer) {
          // A client benefit: the group publishes it for its companies.
          return (
            <>
              <p>{benefit.provider_client?.name}</p>
              <p className="text-muted-foreground text-xs">Client benefit</p>
            </>
          );
        }
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="hover:underline"
                onClick={() => setParam("organization_id", employer.id)}
              >
                {employer.name}
              </button>
            </TooltipTrigger>
            <TooltipContent>Show only this employer</TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: (benefit) => <StatusBadge domain="benefit" status={benefit.display_status} />,
    },
    {
      id: "employees",
      header: "Employees",
      className: "hidden md:table-cell",
      cell: (benefit) => <AvailabilityBadge benefit={benefit} />,
    },
    {
      id: "valid",
      header: "Valid",
      cellClassName: "text-muted-foreground",
      cell: (benefit) => {
        const version = benefitVersion(benefit);
        return version ? validity(version.valid_from, version.valid_until) : "—";
      },
    },
    {
      id: "updated",
      sortKey: "updated_at",
      header: "Updated",
      className: "hidden lg:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (benefit) => formatDate(benefit.updated_at),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          placeholder="Search titles"
          aria-label="Search benefits by title"
          className="max-w-sm"
        />
        <Select
          value={status ?? ALL}
          onValueChange={(value) => setParam("status", value === ALL ? null : value)}
        >
          <SelectTrigger className="w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {BENEFIT_STATUSES.map((option) => (
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
      </div>

      <QueryDataTable
        aria-label="Company benefits"
        query={benefits}
        sort={sort}
        paging={paging}
        columns={columns}
        rowKey={(benefit) => benefit.id}
        empty={
          <EmptyState
            icon={Gift}
            title="No company benefits found"
            description={filtered ? "Try different filters." : undefined}
          />
        }
      />
    </div>
  );
}

function BackToBenefits() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/admin/company-benefits">
        <ArrowLeft aria-hidden />
        Company benefits
      </Link>
    </Button>
  );
}

export function AdminBenefitRecord({ benefitId }: { benefitId: string }) {
  const benefit = useAdminBenefit(benefitId);

  if (benefit.isPending) {
    return (
      <div className="space-y-6">
        <BackToBenefits />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (benefit.isError) {
    return (
      <div className="space-y-6">
        <BackToBenefits />
        {benefit.error instanceof ApiError && benefit.error.isNotFound ? (
          <EmptyState title="Benefit not found" />
        ) : (
          <ErrorState error={benefit.error} onRetry={() => void benefit.refetch()} />
        )}
      </div>
    );
  }
  return <BenefitModeration benefit={benefit.data} />;
}

const ACTIONS = {
  suspend: {
    title: "Suspend this benefit?",
    description:
      "Hides it from the employer's employees at once. The employer sees your reason; editing, resuming or publishing does not lift it, only a reinstatement does.",
    confirmLabel: "Suspend benefit",
    done: "Benefit suspended",
    destructive: true,
  },
  reinstate: {
    title: "Reinstate this benefit?",
    description:
      "Lifts the suspension. Employees see it again while it is published, enabled, inside its dates and the Employer capacity is on.",
    confirmLabel: "Reinstate benefit",
    done: "Benefit reinstated",
    destructive: false,
  },
} as const satisfies Record<AdminBenefitAction, object>;

function BenefitModeration({ benefit }: { benefit: Benefit }) {
  const canSuspend = useCan(BenefitAdminPermission.BENEFIT_SUSPEND);
  const canViewOrganization = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const [acting, setActing] = useState<AdminBenefitAction | null>(null);
  const mutation = useAdminBenefitAction(benefit.id);
  const spec = ACTIONS[acting ?? "suspend"];
  const employer = benefit.provider_organization;
  const suspended = isSuspended(benefit);

  return (
    <div className="space-y-6">
      <BackToBenefits />
      <PageHeader
        title={benefitVersion(benefit)?.title ?? "Benefit"}
        description={
          employer ? (
            canViewOrganization ? (
              <Link href={`/admin/organizations/${employer.id}`} className="hover:underline">
                {employer.name}
              </Link>
            ) : (
              employer.name
            )
          ) : (
            `Client benefit of ${benefit.provider_client?.name ?? "a client"}`
          )
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="benefit" status={benefit.display_status} />
            <AvailabilityBadge benefit={benefit} />
            {canSuspend && !suspended && benefit.availability !== "retired" ? (
              <Button variant="outline" onClick={() => setActing("suspend")}>
                <Pause aria-hidden />
                Suspend
              </Button>
            ) : null}
            {canSuspend && suspended ? (
              <Button onClick={() => setActing("reinstate")}>
                <Play aria-hidden />
                Reinstate
              </Button>
            ) : null}
          </div>
        }
      />
      <BenefitStatusCallout benefit={benefit} audience="admin" />
      <BenefitContentCard benefit={benefit} />
      <LifecycleCard benefit={benefit} />
      <Versions benefitId={benefit.id} />
      <Decisions benefitId={benefit.id} />
      <ReasonDialog
        open={acting !== null}
        onOpenChange={(open) => !open && setActing(null)}
        title={spec.title}
        description={spec.description}
        confirmLabel={spec.confirmLabel}
        destructive={spec.destructive}
        onConfirm={async (reason) => {
          if (!acting) return;
          await mutation.mutateAsync({ action: acting, reason, expected_version: benefit.version });
          toast.success(spec.done);
        }}
      />
    </div>
  );
}

function Versions({ benefitId }: { benefitId: string }) {
  const paging = usePageParam("versions_");
  return (
    <OfferVersionHistory versions={useAdminBenefitVersions(benefitId, paging)} paging={paging} />
  );
}

function Decisions({ benefitId }: { benefitId: string }) {
  const paging = usePageParam("decisions_");
  return (
    <OfferDecisionHistory decisions={useAdminBenefitDecisions(benefitId, paging)} paging={paging} />
  );
}
