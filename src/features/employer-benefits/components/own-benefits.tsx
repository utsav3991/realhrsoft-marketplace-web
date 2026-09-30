"use client";

import {
  Archive,
  ArrowLeft,
  ChartColumn,
  CloudOff,
  Gift,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Upload,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/design-system/primitives/dropdown-menu";
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
import { OfferVersionHistory } from "@/features/offers/components/offer-details";
import {
  EmployerAnalyticsPermission,
  EmployerBenefitPermission,
  useCanInOrganization,
  type OrganizationPermissionCode,
} from "@/shared/authorization";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { QueryDataTable, type RowOf } from "@/shared/components/query-data-table";
import { SearchField } from "@/shared/components/search-field";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { useUrlParams } from "@/shared/hooks/use-url-params";

import {
  useCreateOwnBenefit,
  useOwnBenefitAction,
  useUpdateOwnBenefit,
  type OwnBenefitAction,
} from "../api/mutations";
import {
  BENEFIT_SORTS,
  useOwnBenefit,
  useOwnBenefits,
  useOwnBenefitVersions,
  type Benefit,
} from "../api/queries";
import { benefitBody, benefitValues, benefitVersion, EMPTY_BENEFIT } from "../schemas/benefit";
import {
  AvailabilityBadge,
  BENEFIT_STATUSES,
  BenefitContentCard,
  benefitLimit,
  benefitStatusFrom,
  BenefitStatusCallout,
  isEditable,
  isLive,
  isPausable,
  isPublishable,
  isResumable,
  isRetirable,
  isUnpublishable,
  LifecycleCard,
  usageLimit,
  validity,
} from "./benefit-details";
import { BenefitForm, type BenefitIntentButton } from "./benefit-form";

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
  const sort = useSortParam(BENEFIT_SORTS);
  const paging = usePageParam();
  const benefits = useOwnBenefits(organizationId, { search, status, ordering: sort.value }, paging);
  const canCreate = useCanInOrganization(EmployerBenefitPermission.BENEFIT_CREATE);
  const canReport = useCanInOrganization(EmployerAnalyticsPermission.BENEFIT_REPORT_VIEW);

  function setParam(name: string, value: string | null) {
    set({ [name]: value });
  }

  const columns: DataTableColumns<RowOf<typeof benefits>> = [
    {
      id: "benefit",
      header: "Benefit",
      cell: (benefit) => {
        const limit = benefitLimit(benefit);
        return (
          <>
            <Link href={`/employer/benefits/${benefit.id}`} className="font-medium hover:underline">
              {benefitVersion(benefit)?.title ?? "Untitled benefit"}
            </Link>
            <p className="text-muted-foreground text-xs">
              {limit === null ? null : usageLimit(limit)}
            </p>
          </>
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
      className: "hidden md:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (benefit) => formatDate(benefit.updated_at),
    },
  ];
  const filtered = Boolean(search || status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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

/** Save, plus save-and-publish when the member may publish and the benefit is not live. */
function useFormIntents(live: boolean): BenefitIntentButton[] {
  const canPublish = useCanInOrganization(EmployerBenefitPermission.BENEFIT_PUBLISH);
  // Saving a live benefit publishes the change whatever the intent.
  if (live) return [{ intent: "save", label: "Publish changes", primary: true }];
  if (!canPublish) return [{ intent: "save", label: "Save draft", primary: true }];
  return [
    { intent: "save", label: "Save draft" },
    { intent: "publish", label: "Save and publish", primary: true },
  ];
}

/** H02 (new): a benefit for the selected organization's employees. */
export function NewOwnBenefit() {
  const router = useRouter();
  const organizationId = useSelectedOrganizationId();
  const organizationName = useOrganizationName();
  const create = useCreateOwnBenefit(organizationId);
  const intents = useFormIntents(false);

  return (
    <div className="space-y-6">
      <BackToOwnBenefits />
      <Card>
        <CardHeader>
          <CardTitle>New benefit</CardTitle>
          <CardDescription>
            Save it as a draft, or publish it to your employees now; there is no review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BenefitForm
            defaultValues={EMPTY_BENEFIT}
            organizationName={organizationName}
            intents={intents}
            onSubmit={async (values, intent) => {
              const benefit = await create.mutateAsync({ ...benefitBody(values), intent });
              toast.success(intent === "publish" ? "Benefit published" : "Draft saved");
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

interface OwnerActionSpec {
  label: string;
  icon: LucideIcon;
  permission: OrganizationPermissionCode;
  available: (benefit: Benefit) => boolean;
  title: string;
  description: (benefit: Benefit) => string;
  confirmLabel: string;
  done: string;
  destructive?: boolean;
}

// In priority order: publish is the page's primary button, the rest go in the menu.
const OWNER_ACTIONS: Record<OwnBenefitAction, OwnerActionSpec> = {
  publish: {
    label: "Publish",
    icon: Upload,
    permission: EmployerBenefitPermission.BENEFIT_PUBLISH,
    available: isPublishable,
    title: "Publish this benefit?",
    description: (benefit) => {
      const version = benefitVersion(benefit);
      return `There is no review: your employees can see and use it${version ? ` from ${formatDateTime(version.valid_from)}` : ""}. You can still edit, pause or retire it afterwards.`;
    },
    confirmLabel: "Publish",
    done: "Benefit published",
  },
  resume: {
    label: "Resume",
    icon: Play,
    permission: EmployerBenefitPermission.BENEFIT_PAUSE,
    available: isResumable,
    title: "Resume this benefit?",
    description: () =>
      "Employees can see and use it again while every other rule holds. An Aayulogic suspension stays in place.",
    confirmLabel: "Resume",
    done: "Benefit resumed",
  },
  pause: {
    label: "Pause",
    icon: Pause,
    permission: EmployerBenefitPermission.BENEFIT_PAUSE,
    available: isPausable,
    title: "Pause this benefit?",
    description: () =>
      "Employees stop seeing it and cannot use it until you resume it. Past uses are kept.",
    confirmLabel: "Pause",
    done: "Benefit paused",
  },
  unpublish: {
    label: "Unpublish",
    icon: CloudOff,
    permission: EmployerBenefitPermission.BENEFIT_PUBLISH,
    available: isUnpublishable,
    title: "Unpublish this benefit?",
    description: () =>
      "It goes offline for employees and returns to a draft you can edit and publish again. Past uses are kept. This is not retirement.",
    confirmLabel: "Unpublish",
    done: "Benefit unpublished",
    destructive: true,
  },
  retire: {
    label: "Retire",
    icon: Archive,
    permission: EmployerBenefitPermission.BENEFIT_RETIRE,
    available: isRetirable,
    title: "Retire this benefit?",
    description: () =>
      "This is final: employees can no longer see or use it, and it cannot be edited or published again. Past uses stay in employees' history and in your usage report.",
    confirmLabel: "Retire benefit",
    done: "Benefit retired",
    destructive: true,
  },
};

function useOwnerActions(benefit: Benefit): OwnBenefitAction[] {
  const granted: Record<OwnBenefitAction, boolean> = {
    publish: useCanInOrganization(OWNER_ACTIONS.publish.permission),
    resume: useCanInOrganization(OWNER_ACTIONS.resume.permission),
    pause: useCanInOrganization(OWNER_ACTIONS.pause.permission),
    unpublish: useCanInOrganization(OWNER_ACTIONS.unpublish.permission),
    retire: useCanInOrganization(OWNER_ACTIONS.retire.permission),
  };
  return (Object.keys(OWNER_ACTIONS) as OwnBenefitAction[]).filter(
    (action) => granted[action] && OWNER_ACTIONS[action].available(benefit),
  );
}

function OwnBenefitWorkspace({
  benefit,
  organizationId,
}: {
  benefit: Benefit;
  organizationId: string;
}) {
  const canUpdate = useCanInOrganization(EmployerBenefitPermission.BENEFIT_UPDATE);
  // The version the edit started from: a background refetch must not turn a stale draft into
  // an overwrite of someone else's change (the API answers 409 instead).
  const [editingFrom, setEditingFrom] = useState<Benefit | null>(null);
  const [acting, setActing] = useState<OwnBenefitAction | null>(null);
  const update = useUpdateOwnBenefit(organizationId, benefit.id);
  const action = useOwnBenefitAction(organizationId, benefit.id);
  const intents = useFormIntents(editingFrom ? isLive(editingFrom) : false);
  const actions = useOwnerActions(benefit);
  const version = benefitVersion(benefit);
  const limit = benefitLimit(benefit);
  const spec = OWNER_ACTIONS[acting ?? "publish"];
  const primary = actions.find((a) => a === "publish");
  const menu = actions.filter((a) => a !== "publish");

  return (
    <div className="space-y-6">
      <BackToOwnBenefits />
      <PageHeader
        title={version?.title ?? "Benefit"}
        description={[
          limit === null ? null : usageLimit(limit),
          version ? validity(version.valid_from, version.valid_until) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="benefit" status={benefit.display_status} />
            <AvailabilityBadge benefit={benefit} />
            {primary ? (
              <Button onClick={() => setActing(primary)}>
                <Upload aria-hidden />
                {OWNER_ACTIONS[primary].label}
              </Button>
            ) : null}
            {menu.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menu.map((item) => {
                    const Icon = OWNER_ACTIONS[item].icon;
                    return (
                      <DropdownMenuItem key={item} onSelect={() => setActing(item)}>
                        <Icon aria-hidden />
                        {OWNER_ACTIONS[item].label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
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
              Saving replaces every field.{" "}
              {isLive(editingFrom)
                ? "It is live, so the change is published at once as a new version; past uses keep the version they used. Saving never lifts a pause or suspension."
                : "Publish it when it is ready."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BenefitForm
              defaultValues={benefitValues(editingFrom)}
              organizationName={editingFrom.provider_organization.name}
              intents={intents}
              onCancel={() => setEditingFrom(null)}
              onSubmit={async (values, intent) => {
                await update.mutateAsync({
                  ...benefitBody(values),
                  intent,
                  expected_version: editingFrom.version,
                });
                toast.success(
                  isLive(editingFrom) || intent === "publish" ? "Benefit published" : "Draft saved",
                );
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
      <OwnVersions organizationId={organizationId} benefitId={benefit.id} />

      <ConfirmDialog
        open={acting !== null}
        onOpenChange={(open) => !open && setActing(null)}
        title={spec.title}
        description={spec.description(benefit)}
        confirmLabel={spec.confirmLabel}
        destructive={spec.destructive}
        onConfirm={async () => {
          if (!acting) return;
          await action.mutateAsync({ action: acting, expected_version: benefit.version, reason: "" });
          toast.success(spec.done);
        }}
      />
    </div>
  );
}

function OwnVersions({ organizationId, benefitId }: { organizationId: string; benefitId: string }) {
  const paging = usePageParam("versions_");
  return (
    <OfferVersionHistory
      versions={useOwnBenefitVersions(organizationId, benefitId, paging)}
      paging={paging}
    />
  );
}
