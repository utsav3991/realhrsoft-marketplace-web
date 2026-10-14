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
import { useSession } from "@/shared/auth";
import { useClientCompanies } from "@/features/clients/api/queries";
import { OfferVersionHistory } from "@/features/offers/components/offer-details";
import {
  can,
  ClientAnalyticsPermission,
  ClientBenefitPermission,
  EmployerAnalyticsPermission,
  EmployerBenefitPermission,
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
  useBenefitsFromClient,
  useOwnBenefit,
  useOwnBenefits,
  useOwnBenefitVersions,
  type Benefit,
  type BenefitOwner,
} from "../api/queries";
import {
  benefitValues,
  benefitVersion,
  EMPTY_BENEFIT,
  EMPTY_CLIENT_BENEFIT,
} from "../schemas/benefit";
import {
  audienceLabel,
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
import { BenefitForm, type BenefitFormAudience, type BenefitIntentButton } from "./benefit-form";

const ALL = "all";

/**
 * Where these screens act: the Employer portal (the selected company's own benefits) or the
 * Client portal (the selected client's benefits for its companies). Both use the same codes
 * under different scopes, so the screens are shared.
 */
export type BenefitScope = BenefitOwner["kind"];
type BenefitCode = keyof typeof EmployerBenefitPermission;

const WORKSPACES = {
  organization: {
    basePath: "/employer/benefits",
    title: "Company benefits",
    reportsHref: "/employer/reports",
    codes: EmployerBenefitPermission,
    reportCode: EmployerAnalyticsPermission.BENEFIT_REPORT_VIEW,
    employees: "your employees",
  },
  client: {
    basePath: "/client/benefits",
    title: "Client benefits",
    reportsHref: "/client/reports",
    codes: ClientBenefitPermission,
    reportCode: ClientAnalyticsPermission.BENEFIT_REPORT_VIEW,
    employees: "employees of the audience companies",
  },
} as const;

/** The owner and its screens; only inside <RequireOrganization> or <RequireClient>. */
function useWorkspace(scope: BenefitScope) {
  const { actor } = useSession();
  const id = scope === "client" ? actor?.client?.id : actor?.organization?.id;
  if (!id) throw new Error("Benefit screens need a selected organization or client");
  const owner: BenefitOwner = { kind: scope, id };
  // Each code is checked in the selected scope only; no scope satisfies another (ADR-014).
  const grantScope = scope === "client" ? { clientId: id } : { organizationId: id };
  const canDo = (code: BenefitCode) => can(actor, WORKSPACES[scope].codes[code], grantScope);
  return {
    ...WORKSPACES[scope],
    owner,
    canDo,
    canReport: can(actor, WORKSPACES[scope].reportCode, grantScope),
    ownerName:
      scope === "client"
        ? (actor?.clients.find((c) => c.clientId === id)?.name ?? "")
        : (actor?.memberships.find((m) => m.organizationId === id)?.name ?? ""),
  };
}
type Workspace = ReturnType<typeof useWorkspace>;

/** A company's fixed audience, or a client's companies to choose from. */
function useFormAudience(workspace: Workspace): BenefitFormAudience {
  const client = workspace.owner.kind === "client";
  const companies = useClientCompanies(workspace.owner.id, { enabled: client });
  return client
    ? { kind: "client", clientName: workspace.ownerName, companies: companies.data ?? [] }
    : { kind: "organization", organizationName: workspace.ownerName };
}

/** H01: the selected owner's benefits; status and search live in the URL. */
export function OwnBenefits({ scope = "organization" }: { scope?: BenefitScope }) {
  const { searchParams, set } = useUrlParams();
  const workspace = useWorkspace(scope);
  const search = searchParams.get("search") ?? "";
  const status = benefitStatusFrom(searchParams.get("status"));
  const sort = useSortParam(BENEFIT_SORTS);
  const paging = usePageParam();
  const benefits = useOwnBenefits(
    workspace.owner,
    { search, status, ordering: sort.value },
    paging,
  );
  const canCreate = workspace.canDo("BENEFIT_CREATE");
  const canReport = workspace.canReport;

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
            <Link
              href={`${workspace.basePath}/${benefit.id}`}
              className="font-medium hover:underline"
            >
              {benefitVersion(benefit)?.title ?? "Untitled benefit"}
            </Link>
            <p className="text-muted-foreground text-xs">
              {limit === null ? null : usageLimit(limit)}
            </p>
          </>
        );
      },
    },
    scope === "client" && {
      id: "audience",
      header: "Audience",
      className: "hidden lg:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (benefit) => audienceLabel(benefit, benefitVersion(benefit)?.benefit_policy),
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
              <Link href={workspace.reportsHref}>
                <ChartColumn aria-hidden />
                Usage
              </Link>
            </Button>
          ) : null}
          {canCreate ? (
            <Button asChild>
              <Link href={`${workspace.basePath}/new`}>
                <Plus aria-hidden />
                New benefit
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <QueryDataTable
        aria-label={workspace.title}
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
                : `Benefits you create for ${workspace.employees} appear here with their status.`
            }
          />
        }
      />
    </div>
  );
}

function BackToOwnBenefits({ workspace }: { workspace: Workspace }) {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3">
      <Link href={workspace.basePath}>
        <ArrowLeft aria-hidden />
        {workspace.title}
      </Link>
    </Button>
  );
}

/** Save, plus save-and-publish when the member may publish and the benefit is not live. */
function formIntents(workspace: Workspace, live: boolean): BenefitIntentButton[] {
  const canPublish = workspace.canDo("BENEFIT_PUBLISH");
  // Saving a live benefit publishes the change whatever the intent.
  if (live) return [{ intent: "save", label: "Publish changes", primary: true }];
  if (!canPublish) return [{ intent: "save", label: "Save draft", primary: true }];
  return [
    { intent: "save", label: "Save draft" },
    { intent: "publish", label: "Save and publish", primary: true },
  ];
}

/** H02 (new): a benefit for the selected owner's audience. */
export function NewOwnBenefit({ scope = "organization" }: { scope?: BenefitScope }) {
  const router = useRouter();
  const workspace = useWorkspace(scope);
  const audience = useFormAudience(workspace);
  const create = useCreateOwnBenefit(workspace.owner);
  const intents = formIntents(workspace, false);

  return (
    <div className="space-y-6">
      <BackToOwnBenefits workspace={workspace} />
      <Card>
        <CardHeader>
          <CardTitle>New benefit</CardTitle>
          <CardDescription>
            Save it as a draft, or publish it to {workspace.employees} now; there is no review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BenefitForm
            defaultValues={scope === "client" ? EMPTY_CLIENT_BENEFIT : EMPTY_BENEFIT}
            audience={audience}
            intents={intents}
            onSubmit={async (values, intent) => {
              const benefit = await create.mutateAsync({ values, intent });
              toast.success(intent === "publish" ? "Benefit published" : "Draft saved");
              router.push(`${workspace.basePath}/${benefit.id}`);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/** H02 (existing): one of the selected owner's benefits. */
export function OwnBenefit({
  benefitId,
  scope = "organization",
}: {
  benefitId: string;
  scope?: BenefitScope;
}) {
  const workspace = useWorkspace(scope);
  const benefit = useOwnBenefit(workspace.owner, benefitId);

  if (benefit.isPending) {
    return (
      <div className="space-y-6">
        <BackToOwnBenefits workspace={workspace} />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (benefit.isError) {
    return (
      <div className="space-y-6">
        <BackToOwnBenefits workspace={workspace} />
        {benefit.error instanceof ApiError && benefit.error.isNotFound ? (
          <EmptyState title="Benefit not found" />
        ) : (
          <ErrorState error={benefit.error} onRetry={() => void benefit.refetch()} />
        )}
      </div>
    );
  }
  return <OwnBenefitWorkspace benefit={benefit.data} workspace={workspace} />;
}

interface OwnerActionSpec {
  label: string;
  icon: LucideIcon;
  permission: BenefitCode;
  available: (benefit: Benefit) => boolean;
  title: string;
  description: (benefit: Benefit, employees: string) => string;
  confirmLabel: string;
  done: string;
  destructive?: boolean;
}

// In priority order: publish is the page's primary button, the rest go in the menu.
const OWNER_ACTIONS: Record<OwnBenefitAction, OwnerActionSpec> = {
  publish: {
    label: "Publish",
    icon: Upload,
    permission: "BENEFIT_PUBLISH",
    available: isPublishable,
    title: "Publish this benefit?",
    description: (benefit, employees) => {
      const version = benefitVersion(benefit);
      return `There is no review: ${employees} can see and use it${version ? ` from ${formatDateTime(version.valid_from)}` : ""}. You can still edit, pause or retire it afterwards.`;
    },
    confirmLabel: "Publish",
    done: "Benefit published",
  },
  resume: {
    label: "Resume",
    icon: Play,
    permission: "BENEFIT_PAUSE",
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
    permission: "BENEFIT_PAUSE",
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
    permission: "BENEFIT_PUBLISH",
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
    permission: "BENEFIT_RETIRE",
    available: isRetirable,
    title: "Retire this benefit?",
    description: () =>
      "This is final: employees can no longer see or use it, and it cannot be edited or published again. Past uses stay in employees' history and in your usage report.",
    confirmLabel: "Retire benefit",
    done: "Benefit retired",
    destructive: true,
  },
};

function ownerActions(workspace: Workspace, benefit: Benefit): OwnBenefitAction[] {
  return (Object.keys(OWNER_ACTIONS) as OwnBenefitAction[]).filter(
    (action) =>
      workspace.canDo(OWNER_ACTIONS[action].permission) && OWNER_ACTIONS[action].available(benefit),
  );
}

function OwnBenefitWorkspace({ benefit, workspace }: { benefit: Benefit; workspace: Workspace }) {
  const canUpdate = workspace.canDo("BENEFIT_UPDATE");
  const audience = useFormAudience(workspace);
  // The version the edit started from: a background refetch must not turn a stale draft into
  // an overwrite of someone else's change (the API answers 409 instead).
  const [editingFrom, setEditingFrom] = useState<Benefit | null>(null);
  const [acting, setActing] = useState<OwnBenefitAction | null>(null);
  const update = useUpdateOwnBenefit(workspace.owner, benefit.id);
  const action = useOwnBenefitAction(workspace.owner, benefit.id);
  const intents = formIntents(workspace, editingFrom ? isLive(editingFrom) : false);
  const actions = ownerActions(workspace, benefit);
  const version = benefitVersion(benefit);
  const limit = benefitLimit(benefit);
  const spec = OWNER_ACTIONS[acting ?? "publish"];
  const primary = actions.find((a) => a === "publish");
  const menu = actions.filter((a) => a !== "publish");

  return (
    <div className="space-y-6">
      <BackToOwnBenefits workspace={workspace} />
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
              audience={audience}
              intents={intents}
              onCancel={() => setEditingFrom(null)}
              onSubmit={async (values, intent) => {
                await update.mutateAsync({
                  values,
                  intent,
                  expectedVersion: editingFrom.version,
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
      <OwnVersions owner={workspace.owner} benefitId={benefit.id} />

      <ConfirmDialog
        open={acting !== null}
        onOpenChange={(open) => !open && setActing(null)}
        title={spec.title}
        description={spec.description(benefit, workspace.employees)}
        confirmLabel={spec.confirmLabel}
        destructive={spec.destructive}
        onConfirm={async () => {
          if (!acting) return;
          await action.mutateAsync({
            action: acting,
            expected_version: benefit.version,
            reason: "",
          });
          toast.success(spec.done);
        }}
      />
    </div>
  );
}

function OwnVersions({ owner, benefitId }: { owner: BenefitOwner; benefitId: string }) {
  const paging = usePageParam("versions_");
  return (
    <OfferVersionHistory
      versions={useOwnBenefitVersions(owner, benefitId, paging)}
      paging={paging}
    />
  );
}

/**
 * Client benefits whose audience includes the selected company, published by its client
 * (group). Read-only here: only the client's role holders edit them, in the Client portal.
 */
export function BenefitsFromClient() {
  const { searchParams } = useUrlParams();
  const workspace = useWorkspace("organization");
  const search = searchParams.get("search") ?? "";
  const status = benefitStatusFrom(searchParams.get("status"));
  const sort = useSortParam(BENEFIT_SORTS);
  const paging = usePageParam();
  const benefits = useBenefitsFromClient(
    workspace.owner.id,
    { search, status, ordering: sort.value },
    paging,
  );
  const columns: DataTableColumns<RowOf<typeof benefits>> = [
    {
      id: "benefit",
      header: "Benefit",
      cell: (benefit) => {
        const limit = benefitLimit(benefit);
        return (
          <>
            <p className="font-medium">{benefitVersion(benefit)?.title ?? "Untitled benefit"}</p>
            <p className="text-muted-foreground text-xs">
              {limit === null ? null : usageLimit(limit)}
            </p>
          </>
        );
      },
    },
    {
      id: "client",
      header: "Published by",
      cell: (benefit) => benefit.provider_client?.name ?? "—",
    },
    {
      id: "audience",
      header: "Audience",
      className: "hidden lg:table-cell",
      cellClassName: "text-muted-foreground",
      cell: (benefit) => audienceLabel(benefit, benefitVersion(benefit)?.benefit_policy),
    },
    {
      id: "status",
      header: "Status",
      cell: (benefit) => <StatusBadge domain="benefit" status={benefit.display_status} />,
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
  ];
  return (
    <div className="space-y-4">
      <SearchField
        placeholder="Search titles"
        aria-label="Search group benefits by title"
        className="max-w-sm"
      />
      <QueryDataTable
        aria-label="Benefits from your group"
        query={benefits}
        sort={sort}
        paging={paging}
        columns={columns}
        rowKey={(benefit) => benefit.id}
        empty={
          <EmptyState
            icon={Gift}
            title={search ? "No benefits match" : "No group benefits for this company"}
            description="Benefits your client group publishes for this company appear here."
          />
        }
      />
    </div>
  );
}
