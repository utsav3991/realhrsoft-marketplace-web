"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Building2, CheckCircle2, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/primitives/alert";
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/primitives/dialog";
import {
  Form,
  FormAlert,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/primitives/form";
import { Input } from "@/design-system/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { Textarea } from "@/design-system/primitives/textarea";
import { ApiError, errorMessage, isUuid } from "@/shared/api";
import {
  IntegrationAdminPermission,
  OrganizationAdminPermission,
  PartnerAdminPermission,
  useCan,
} from "@/shared/authorization";
import { Detail, DetailList } from "@/shared/components/details";
import { ReasonDialog } from "@/shared/components/reason-dialog";
import { STATUS_DEFINITIONS, StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";
import { reasonSchema } from "@/shared/forms/reason";
import { formatDateTime } from "@/shared/lib/format";

import { useReconcile, useRedriveSyncEvents } from "../api/mutations";
import {
  useSyncedCompany,
  useSyncStatus,
  type ReconciliationRun,
  type ReconciliationScope,
  type SyncReceipt,
  type SyncStatus,
} from "../api/queries";

const STUCK = new Set(["quarantined", "dead"]);
const COUNT_ORDER = ["pending", "waiting_dependency", "quarantined", "dead", "applied"] as const;

function age(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "Nothing waiting";
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${Math.round(seconds / 3600)} h`;
}

/**
 * Health of the RealHRSoft directory synchronization: receipts by status, the age of the
 * oldest unapplied event, the newest problems and recent reconciliation runs. Refreshes
 * every 15 seconds.
 */
export function RealHRSoftSync() {
  const status = useSyncStatus();
  const canReconcile = useCan(IntegrationAdminPermission.SYNC_RECONCILE);
  const [reconciling, setReconciling] = useState(false);

  if (status.isPending) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (status.isError) {
    return <ErrorState error={status.error} onRetry={() => void status.refetch()} />;
  }
  const health = status.data;
  return (
    <div className="space-y-6">
      {health.alert ? (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden />
          <AlertTitle>Synchronization needs attention</AlertTitle>
          <AlertDescription>
            An event has waited more than 60 seconds, or an event is quarantined or dead. Check
            the problems below; requeue stuck events once their cause is fixed.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle2 aria-hidden />
          <AlertTitle>Synchronization is healthy</AlertTitle>
          <AlertDescription>Events are applied as they arrive.</AlertDescription>
        </Alert>
      )}

      <HealthCard health={health} onReconcile={canReconcile ? () => setReconciling(true) : null} />
      <ProblemsCard problems={health.problems} />
      <ReconciliationsCard runs={health.reconciliations} />
      <CompanyLookup />

      {reconciling ? <ReconcileDialog onOpenChange={setReconciling} /> : null}
    </div>
  );
}

function HealthCard({
  health,
  onReconcile,
}: {
  health: SyncStatus;
  onReconcile: (() => void) | null;
}) {
  const counts = health.counts as Record<string, number | undefined>;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Events</CardTitle>
          <CardDescription>Receipts kept by the inbox, by status.</CardDescription>
        </div>
        {onReconcile ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onReconcile}
            disabled={!health.reconciliation_configured}
            title={
              health.reconciliation_configured
                ? undefined
                : "RealHRSoft's API is not configured for this deployment"
            }
          >
            <RefreshCw aria-hidden />
            Reconcile
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <DetailList>
          {COUNT_ORDER.map((key) => (
            <Detail key={key} label={STATUS_DEFINITIONS.syncEvent[key].label}>
              {counts[key] ?? 0}
            </Detail>
          ))}
          <Detail label="Oldest unapplied">{age(health.oldest_unapplied_seconds)}</Detail>
          <Detail label="Last applied">
            {health.last_applied_at ? formatDateTime(health.last_applied_at) : "Never"}
          </Detail>
          <Detail label="Reconciliation">
            {health.reconciliation_configured ? "Configured" : "Not configured"}
          </Detail>
        </DetailList>
      </CardContent>
    </Card>
  );
}

function ProblemsCard({ problems }: { problems: readonly SyncReceipt[] }) {
  const canRedrive = useCan(IntegrationAdminPermission.SYNC_REDRIVE);
  const [requeue, setRequeue] = useState<readonly SyncReceipt[] | null>(null);
  const redrive = useRedriveSyncEvents();
  const stuck = problems.filter((p) => STUCK.has(p.status ?? ""));

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Problems</CardTitle>
          <CardDescription>
            Up to 20 newest waiting, quarantined or dead events. Waiting events retry on their
            own; quarantined and dead ones need requeueing after the cause is fixed.
          </CardDescription>
        </div>
        {canRedrive && stuck.length > 1 ? (
          <Button variant="outline" size="sm" onClick={() => setRequeue(stuck)}>
            <RotateCcw aria-hidden />
            Requeue all {stuck.length}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <DataTable<SyncReceipt>
          aria-label="Sync problems"
          rows={problems}
          rowKey={(row) => row.receipt_id}
          empty={<EmptyState icon={CheckCircle2} title="No problems" className="py-8" />}
          columns={[
            {
              id: "event",
              header: "Event",
              cell: (row) => (
                <>
                  <p className="font-mono text-xs">{row.event_type}</p>
                  <p className="text-muted-foreground text-xs">
                    {row.aggregate_type} <span className="font-mono">{row.aggregate_uuid}</span>{" "}
                    · revision {row.aggregate_revision}
                  </p>
                </>
              ),
            },
            {
              id: "status",
              header: "Status",
              cell: (row) => <StatusBadge domain="syncEvent" status={row.status ?? ""} />,
            },
            {
              id: "error",
              header: "Error",
              cell: (row) => (
                <>
                  <p className="font-mono text-xs">{row.error_code}</p>
                  <p className="text-muted-foreground text-xs">{row.error_detail}</p>
                </>
              ),
            },
            {
              id: "attempts",
              header: "Attempts",
              className: "hidden md:table-cell",
              cell: (row) => row.attempts ?? 0,
            },
            {
              id: "received",
              header: "Received",
              className: "hidden lg:table-cell",
              cellClassName: "text-muted-foreground",
              cell: (row) => formatDateTime(row.received_at),
            },
            canRedrive && {
              id: "actions",
              header: <span className="sr-only">Actions</span>,
              className: "text-right",
              cell: (row) =>
                STUCK.has(row.status ?? "") ? (
                  <Button variant="ghost" size="sm" onClick={() => setRequeue([row])}>
                    Requeue
                  </Button>
                ) : null,
            },
          ]}
        />
      </CardContent>

      <ReasonDialog
        open={requeue !== null}
        onOpenChange={(open) => !open && setRequeue(null)}
        title={requeue && requeue.length > 1 ? `Requeue ${requeue.length} events?` : "Requeue this event?"}
        description="They return to the queue with their attempts reset and are applied again in revision order. Requeue only after fixing what quarantined them, or they fail again."
        confirmLabel="Requeue"
        onConfirm={async (reason) => {
          if (!requeue) return;
          const result = await redrive.mutateAsync({
            event_ids: requeue.map((row) => row.event_id),
            reason,
          });
          toast.success(`Requeued ${result.event_ids.length} event(s)`);
        }}
      />
    </Card>
  );
}

function ReconciliationsCard({ runs }: { runs: readonly ReconciliationRun[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reconciliations</CardTitle>
        <CardDescription>
          The 10 newest runs: the daily full run, operator requests and the targeted fetches of
          records events were waiting for.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable<ReconciliationRun>
          aria-label="Reconciliation runs"
          rows={runs}
          rowKey={(run) => run.id}
          empty={<EmptyState icon={RefreshCw} title="No reconciliation yet" className="py-8" />}
          columns={[
            {
              id: "scope",
              header: "Scope",
              cell: (run) => (
                <>
                  <p className="capitalize">{run.scope}</p>
                  {run.target ? (
                    <p className="text-muted-foreground font-mono text-xs">{run.target}</p>
                  ) : null}
                </>
              ),
            },
            {
              id: "status",
              header: "Status",
              cell: (run) => <StatusBadge domain="reconciliation" status={run.status ?? ""} />,
            },
            {
              id: "progress",
              header: "Progress",
              className: "hidden md:table-cell",
              cellClassName: "text-muted-foreground text-xs",
              cell: (run) => (
                <>
                  <p>{run.stage}</p>
                  <p>
                    {Object.entries(run.counts as Record<string, number>)
                      .map(([key, n]) => `${key} ${n}`)
                      .join(" · ")}
                  </p>
                  {run.error_detail ? <p className="text-destructive">{run.error_detail}</p> : null}
                </>
              ),
            },
            {
              id: "requested",
              header: "Requested",
              className: "hidden lg:table-cell",
              cellClassName: "text-muted-foreground",
              cell: (run) => (
                <>
                  <p>{formatDateTime(run.created_at)}</p>
                  <p className="font-mono text-xs">{run.requested_by}</p>
                </>
              ),
            },
            {
              id: "finished",
              header: "Finished",
              cellClassName: "text-muted-foreground",
              cell: (run) => (run.finished_at ? formatDateTime(run.finished_at) : "—"),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

const SCOPES: readonly { value: ReconciliationScope; label: string; target?: string }[] = [
  { value: "full", label: "Everything (every client, company and employee)" },
  { value: "partner", label: "One client", target: "RealHRSoft client UUID" },
  { value: "company", label: "One company", target: "RealHRSoft company UUID" },
  { value: "employee", label: "One employee", target: "RealHRSoft employee UUID" },
];

const reconcileSchema = z
  .object({
    scope: z.enum(["full", "partner", "company", "employee"]),
    target: z.string().trim(),
    reason: reasonSchema,
  })
  .superRefine((values, ctx) => {
    if (values.scope !== "full" && !isUuid(values.target)) {
      ctx.addIssue({ code: "custom", path: ["target"], message: "Enter the RealHRSoft UUID" });
    }
  });
type ReconcileValues = z.infer<typeof reconcileSchema>;

/** Queues a reconciliation: RealHRSoft is read in the background, never during the request. */
function ReconcileDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const reconcile = useReconcile();
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<ReconcileValues>({
    resolver: zodResolver(reconcileSchema),
    defaultValues: { scope: "full", target: "", reason: "" },
  });
  const scope = useWatch({ control: form.control, name: "scope" });
  const spec = SCOPES.find((option) => option.value === scope);
  const { isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await reconcile.mutateAsync({
        scope: values.scope,
        target: values.scope === "full" ? null : values.target,
        reason: values.reason,
      });
      toast.success("Reconciliation queued");
      onOpenChange(false);
    } catch (error) {
      if (!applyApiFieldErrors(error, form, { scope: "scope", target: "target", reason: "reason" }))
        setFailure(errorMessage(error));
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !isSubmitting && onOpenChange(open)}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Reconcile with RealHRSoft</DialogTitle>
              <DialogDescription>
                Reads current snapshots from RealHRSoft and applies them in revision order. Newer
                events are never rolled back. Runs are rate limited to protect RealHRSoft.
              </DialogDescription>
            </DialogHeader>
            {failure ? <FormAlert>{failure}</FormAlert> : null}
            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What to reconcile</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger ref={field.ref} onBlur={field.onBlur}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SCOPES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {spec?.target ? (
              <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{spec.target}</FormLabel>
                    <FormControl>
                      <Input className="font-mono" autoComplete="off" spellCheck={false} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormDescription>Recorded in the audit log.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
                Queue reconciliation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/** Where a RealHRSoft company landed in the Marketplace, by its RealHRSoft UUID. */
function CompanyLookup() {
  const [draft, setDraft] = useState("");
  const [lookedUp, setLookedUp] = useState<string | null>(null);
  const company = useSyncedCompany(lookedUp);
  const canViewOrganizations = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const canViewPartners = useCan(PartnerAdminPermission.PARTNER_VIEW);
  const valid = isUuid(draft.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Find a synchronized company</CardTitle>
        <CardDescription>
          Look up a company by its RealHRSoft UUID to see its Marketplace record and client.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) setLookedUp(draft.trim());
          }}
        >
          <Input
            className="max-w-md font-mono"
            placeholder="RealHRSoft company UUID"
            aria-label="RealHRSoft company UUID"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" variant="outline" disabled={!valid}>
            <Building2 aria-hidden />
            Look up
          </Button>
        </form>
        {lookedUp === null ? null : company.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : company.isError ? (
          company.error instanceof ApiError && company.error.isNotFound ? (
            <p className="text-muted-foreground text-sm">No company with this UUID was synchronized.</p>
          ) : (
            <ErrorState error={company.error} onRetry={() => void company.refetch()} />
          )
        ) : (
          <DetailList>
            <Detail label="Company">
              {canViewOrganizations ? (
                <Link href={`/admin/organizations/${company.data.id}`} className="hover:underline">
                  {company.data.name}
                </Link>
              ) : (
                company.data.name
              )}
            </Detail>
            <Detail label="Client">
              {canViewPartners ? (
                <Link href={`/admin/partners/${company.data.client_id}`} className="hover:underline">
                  View client
                </Link>
              ) : (
                <span className="font-mono text-xs">{company.data.client_external_uuid}</span>
              )}
            </Detail>
            <Detail label="State">
              <Badge intent={company.data.active ? "success" : "neutral"}>
                {company.data.active ? "Active" : "Deactivated"}
              </Badge>
            </Detail>
            <Detail label="Employer capacity">{company.data.employer ? "On" : "Off"}</Detail>
            <Detail label="Revision">{company.data.source_revision}</Detail>
            <Detail label="Updated">{formatDateTime(company.data.updated_at)}</Detail>
          </DetailList>
        )}
      </CardContent>
    </Card>
  );
}
