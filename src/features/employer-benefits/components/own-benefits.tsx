"use client";

import { Archive, ArrowLeft, ChartColumn, Gift, Pencil, Plus, Search, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { type DataTableColumns } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { PageHeader } from "@/design-system/components/page-header";
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
import { ApiError } from "@/shared/api";
import { useSelectedOrganizationId, useSession } from "@/shared/auth";
import {
  EmployerAnalyticsPermission,
  EmployerBenefitPermission,
  useCanInOrganization,
} from "@/shared/authorization";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { formatDateTime } from "@/shared/lib/format";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";

import { useCreateOwnBenefit, useOwnBenefitAction, useUpdateOwnBenefit } from "../api/mutations";
import { BENEFIT_SORTS, useOwnBenefit, useOwnBenefits, type Benefit } from "../api/queries";
import { benefitBody, benefitValues, EMPTY_BENEFIT } from "../schemas/benefit";
import {
  AvailabilityBadge,
  BENEFIT_STATUSES,
  BenefitContentCard,
  benefitStatusFrom,
  BenefitStatusCallout,
  isEditable,
  isPublishable,
  isRetirable,
  LifecycleCard,
  usageLimit,
  validity,
} from "./benefit-details";
import { BenefitForm } from "./benefit-form";

const ALL = "all";

/** The selected employer organization's display name, for the fixed audience. */
function useOrganizationName(): string {
  const { actor } = useSession();
  const organizationId = useSelectedOrganizationId();
  return actor?.memberships.find((m) => m.organizationId === organizationId)?.name ?? "";
}

/** H01: the selected employer's benefits; status and search live in the URL. */
export function OwnBenefits() {
  const { searchParams, set } = useUrlParams();
  const organizationId = useSelectedOrganizationId();
  const search = searchParams.get("search") ?? "";
  const status = benefitStatusFrom(searchParams.get("status"));
  const [draft, setDraft] = useState(search);
  const sort = useSortParam(BENEFIT_SORTS);
  const paging = usePageParam();
  const benefits = useOwnBenefits(organizationId, { search, status, ordering: sort.value }, paging);
  const canCreate = useCanInOrganization(EmployerBenefitPermission.BENEFIT_CREATE);
  const canReport = useCanInOrganization(EmployerAnalyticsPermission.BENEFIT_REPORT_VIEW);

  function setParam(name: string, value: string | null) {
    set({ [name]: value });
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParam("search", draft.trim() || null);
  }

  const columns: DataTableColumns<RowOf<typeof benefits>> = [
    {
      id: "benefit",
      sortKey: "title",
      header: "Benefit",
      cell: (benefit) => (
        <>
          <Link href={`/employer/benefits/${benefit.id}`} className="font-medium hover:underline">
            {benefit.title}
          </Link>
          <p className="text-muted-foreground text-xs">
            {usageLimit(benefit.max_claims_per_employee)}
          </p>
        </>
      ),
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
      sortKey: "valid_from",
      header: "Valid",
      cellClassName: "text-muted-foreground",
      cell: (benefit) => validity(benefit.valid_from, benefit.valid_until),
    },
    {
      id: "claims",
      sortKey: "claim_count",
      header: "Claims",
      className: "text-right",
      cellClassName: "tabular-nums",
      cell: (benefit) => benefit.claim_count,
    },
  ];
  const filtered = Boolean(search || status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={onSearch} role="search" className="flex w-full max-w-sm gap-2">
            <Input
              type="search"
              maxLength={150}
              placeholder="Search titles"
              aria-label="Search benefits by title"
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
        </div>
        <div className="flex flex-wrap gap-2">
          {canReport ? (
            <Button asChild variant="outline">
              <Link href="/employer/reports">
                <ChartColumn aria-hidden />
                Usage
              </Link>
            </Button>
          ) : null}
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
            title={filtered ? "No benefits match" : "No benefits yet"}
            description={
              filtered
                ? "Try another search or status."
                : "Benefits you create for your employees appear here with their status."
            }
          />
        }
      />
    </div>
  );
}

function BackToOwnBenefits() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href="/employer/benefits">
        <ArrowLeft aria-hidden />
        Company benefits
      </Link>
    </Button>
  );
}

/** H02 (new): a draft for the selected organization's employees. */
export function NewOwnBenefit() {
  const router = useRouter();
  const organizationId = useSelectedOrganizationId();
  const organizationName = useOrganizationName();
  const create = useCreateOwnBenefit(organizationId);

  return (
    <div className="space-y-6">
      <BackToOwnBenefits />
      <Card>
        <CardHeader>
          <CardTitle>New benefit</CardTitle>
          <CardDescription>
            It is saved as a draft. Publish it when it is ready; there is no review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BenefitForm
            defaultValues={EMPTY_BENEFIT}
            organizationName={organizationName}
            submitLabel="Save draft"
            onSubmit={async (values) => {
              const benefit = await create.mutateAsync(benefitBody(values));
              toast.success("Draft saved");
              router.push(`/employer/benefits/${benefit.id}`);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/** H02 (existing): one of the selected organization's benefits. */
export function OwnBenefit({ benefitId }: { benefitId: string }) {
  const organizationId = useSelectedOrganizationId();
  const benefit = useOwnBenefit(organizationId, benefitId);

  if (benefit.isPending) {
    return (
      <div className="space-y-6">
        <BackToOwnBenefits />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (benefit.isError) {
    return (
      <div className="space-y-6">
        <BackToOwnBenefits />
        {benefit.error instanceof ApiError && benefit.error.isNotFound ? (
          <EmptyState title="Benefit not found" />
        ) : (
          <ErrorState error={benefit.error} onRetry={() => void benefit.refetch()} />
        )}
      </div>
    );
  }
  return <OwnBenefitWorkspace benefit={benefit.data} organizationId={organizationId} />;
}

function OwnBenefitWorkspace({
  benefit,
  organizationId,
}: {
  benefit: Benefit;
  organizationId: string;
}) {
  const canUpdate = useCanInOrganization(EmployerBenefitPermission.BENEFIT_UPDATE);
  const canPublish = useCanInOrganization(EmployerBenefitPermission.BENEFIT_PUBLISH);
  const canRetire = useCanInOrganization(EmployerBenefitPermission.BENEFIT_RETIRE);
  // The version the edit started from: a background refetch must not turn a stale draft into
  // an overwrite of someone else's change (the API answers 409 instead).
  const [editingFrom, setEditingFrom] = useState<Benefit | null>(null);
  const [acting, setActing] = useState<"publish" | "retire" | null>(null);
  const update = useUpdateOwnBenefit(organizationId, benefit.id);
  const action = useOwnBenefitAction(organizationId, benefit.id);

  return (
    <div className="space-y-6">
      <BackToOwnBenefits />
      <PageHeader
        title={benefit.title}
        description={`${usageLimit(benefit.max_claims_per_employee)} · ${validity(benefit.valid_from, benefit.valid_until)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="benefit" status={benefit.display_status} />
            <AvailabilityBadge benefit={benefit} />
            {canRetire && isRetirable(benefit) ? (
              <Button variant="outline" onClick={() => setActing("retire")}>
                <Archive aria-hidden />
                Retire
              </Button>
            ) : null}
            {canPublish && isPublishable(benefit) ? (
              <Button onClick={() => setActing("publish")}>
                <Upload aria-hidden />
                Publish
              </Button>
            ) : null}
          </div>
        }
      />
      <BenefitStatusCallout benefit={benefit} audience="employer" />
      {editingFrom ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit benefit</CardTitle>
            <CardDescription>
              Saving replaces every field and applies at once. Claims already made keep the title
              and usage rules shown when they were claimed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BenefitForm
              defaultValues={benefitValues(editingFrom)}
              organizationName={editingFrom.organization_name}
              submitLabel="Save changes"
              onCancel={() => setEditingFrom(null)}
              onSubmit={async (values) => {
                await update.mutateAsync({
                  ...benefitBody(values),
                  expected_version: editingFrom.version,
                });
                toast.success("Benefit saved");
                setEditingFrom(null);
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <BenefitContentCard
          benefit={benefit}
          action={
            canUpdate && isEditable(benefit) ? (
              <Button variant="outline" size="sm" onClick={() => setEditingFrom(benefit)}>
                <Pencil aria-hidden />
                Edit
              </Button>
            ) : null
          }
        />
      )}
      <LifecycleCard benefit={benefit} />

      <ConfirmDialog
        open={acting === "publish"}
        onOpenChange={(open) => !open && setActing(null)}
        title="Publish this benefit?"
        description={`There is no review: your employees can see and claim it from ${formatDateTime(benefit.valid_from)}. You can still edit or retire it afterwards.`}
        confirmLabel="Publish"
        onConfirm={async () => {
          await action.mutateAsync({
            action: "publish",
            expected_version: benefit.version,
            reason: "",
          });
          toast.success("Benefit published");
        }}
      />
      <ReasonDialog
        open={acting === "retire"}
        onOpenChange={(open) => !open && setActing(null)}
        title="Retire this benefit?"
        description="This is final: employees can no longer see or claim it, and it cannot be edited or published again. Claims made so far stay in employees' history and in your usage report."
        confirmLabel="Retire benefit"
        destructive
        optional
        onConfirm={async (reason) => {
          await action.mutateAsync({ action: "retire", expected_version: benefit.version, reason });
          toast.success("Benefit retired");
        }}
      />
    </div>
  );
}
