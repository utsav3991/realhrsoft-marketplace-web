"use client";

import { BarChart3 } from "lucide-react";

import { DataTable } from "@/design-system/components/data-table";
import { EmptyState } from "@/design-system/components/empty-state";
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
import { addDays, REPORT_TIME_ZONE, reportToday } from "@/features/analytics/api/period";
import { ErrorState } from "@/shared/feedback/states";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { formatCalendarDate, formatDateTime } from "@/shared/lib/format";

import { useAdStats, type AdStats, type Workspace } from "../api/queries";

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;
type Range = (typeof RANGES)[number]["value"];
const DEFAULT_RANGE: Range = "30";
const RANGE_PARAM = "delivery_range";

function isRange(value: string | null): value is Range {
  return RANGES.some((range) => range.value === value);
}

type Counts = AdStats["totals"];

const METRICS: readonly { key: keyof Counts; label: string; help: string }[] = [
  { key: "served", label: "Served", help: "Employee-days the ad was returned for a slot" },
  { key: "rendered", label: "Rendered", help: "Employee-days it was on screen" },
  { key: "clicks", label: "Clicks", help: "Employee-days with a click" },
];

const number = new Intl.NumberFormat();
const percent = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1 });

/** Clicks per rendered impression; unavailable (not zero) before anything rendered. */
function clickThrough(counts: Counts): string {
  return counts.rendered > 0 ? percent.format(counts.clicks / counts.rendered) : "—";
}

function Tile({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div className="bg-card shadow-ring rounded-2xl border p-4">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{help}</p>
    </div>
  );
}

const countColumns = METRICS.map((metric) => ({
  id: metric.key,
  header: metric.label,
  cellClassName: "tabular-nums",
  sortValue: (row: Counts) => row[metric.key],
  cell: (row: Counts) => number.format(row[metric.key]),
}));

/**
 * Delivery counts of one advertisement from the daily rollups. Each count is once per employee,
 * slot and local day; only aggregates exist, never who saw it. Conversions are not measured yet,
 * so they read "not available", never zero.
 */
export function AdPerformance({ workspace, adId }: { workspace: Workspace; adId: string }) {
  const { searchParams, set } = useUrlParams();
  const param = searchParams.get(RANGE_PARAM);
  const range = isRange(param) ? param : DEFAULT_RANGE;
  const dateTo = reportToday();
  const dateFrom = addDays(dateTo, -(Number(range) - 1));
  const stats = useAdStats(workspace, adId, dateFrom, dateTo);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle>Delivery</CardTitle>
          <CardDescription>
            Counted once per employee, slot and day ({REPORT_TIME_ZONE}); refreshed about every 5
            minutes. Separate from offer numbers.
          </CardDescription>
        </div>
        <Select
          value={range}
          onValueChange={(value) => set({ [RANGE_PARAM]: value === DEFAULT_RANGE ? null : value })}
        >
          <SelectTrigger className="w-40" aria-label="Delivery period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : stats.isError ? (
          <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
        ) : (
          <LoadedPerformance report={stats.data} />
        )}
      </CardContent>
    </Card>
  );
}

function LoadedPerformance({ report }: { report: AdStats }) {
  const { totals } = report;
  return (
    <>
      <p className="text-muted-foreground text-sm">
        {formatCalendarDate(report.date_from)} – {formatCalendarDate(report.date_to)}
        {report.refreshed_at ? ` · Updated ${formatDateTime(report.refreshed_at)}` : null}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {METRICS.map((metric) => (
          <Tile
            key={metric.key}
            label={metric.label}
            value={number.format(totals[metric.key])}
            help={metric.help}
          />
        ))}
        <Tile label="Click-through" value={clickThrough(totals)} help="Clicks per rendered" />
        <Tile
          label="Conversions"
          value="Not available"
          help="Needs an attribution rule; not measured yet"
        />
      </div>
      {report.daily.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No delivery in this period"
          description="Counts appear once the approved ad is served to employees."
          className="py-8"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <DataTable
            aria-label="Delivery by slot"
            rows={report.slots}
            rowKey={(row) => row.slot_key}
            columns={[
              {
                id: "slot",
                header: "Slot",
                sortValue: (row) => row.slot_key,
                cell: (row) => <span className="font-mono text-xs">{row.slot_key}</span>,
              },
              ...countColumns,
            ]}
          />
          <DataTable
            aria-label="Delivery by day"
            rows={[...report.daily].reverse()}
            rowKey={(row) => row.day}
            columns={[
              {
                id: "day",
                header: "Day",
                sortValue: (row) => row.day,
                cell: (row) => formatCalendarDate(row.day),
              },
              ...countColumns,
            ]}
          />
        </div>
      )}
    </>
  );
}
