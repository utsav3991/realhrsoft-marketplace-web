"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { DataTable } from "@/design-system/components/data-table";
import { DatePicker } from "@/design-system/components/date-picker";
import { Field } from "@/design-system/components/field";
import { Stagger, StaggerItem } from "@/design-system/components/motion";
import { Alert, AlertDescription } from "@/design-system/primitives/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/primitives/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Skeleton } from "@/design-system/primitives/skeleton";
import { ErrorState } from "@/shared/feedback/states";
import { formatCalendarDate, formatDateTime } from "@/shared/lib/format";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { useSortParam } from "@/shared/hooks/use-sort-param";

import {
  INTERVALS,
  isInterval,
  isRange,
  periodFrom,
  RANGES,
  reportToday,
  addDays,
  type Interval,
  type PeriodResult,
} from "../api/period";
import type { Metrics, OfferReportSummary } from "../api/queries";

type Metric = keyof Metrics;

export const METRICS: readonly MetricDefinition<Metric>[] = [
  {
    key: "views",
    label: "Views",
    description: "Offer page opens, each employee counted once per offer per day.",
  },
  { key: "claims", label: "Claims", description: "Claims made in the period." },
  {
    key: "redemptions",
    label: "Redemptions",
    description: "Redemptions confirmed in the period, whenever the claim was made.",
  },
];

// --- URL state ---------------------------------------------------------------------------
/** Replaces search params in place; `null` removes one. */
/** Replaces search params in place (`null` removes one); report tables return to page 1. */
export function useSetParams() {
  return useUrlParams().set;
}

export function usePeriod(): PeriodResult {
  const searchParams = useSearchParams();
  return periodFrom(new URLSearchParams(searchParams));
}

/** Range and bucket size, in one row above the report (state lives in the URL). */
export function PeriodControls({ children }: { children?: React.ReactNode }) {
  const searchParams = useSearchParams();
  const setParams = useSetParams();
  const rawRange = searchParams.get("range");
  const range = isRange(rawRange) ? rawRange : "30";
  const rawInterval = searchParams.get("interval");
  const interval: Interval = isInterval(rawInterval) ? rawInterval : "day";
  const result = periodFrom(new URLSearchParams(searchParams));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          value={range}
          onValueChange={(value) => {
            if (value !== "custom") {
              setParams({ range: value === "30" ? null : value, start: null, end: null });
              return;
            }
            // Start the custom range from the dates currently shown.
            const today = reportToday();
            setParams({
              range: "custom",
              start: searchParams.get("start") ?? addDays(today, -29),
              end: searchParams.get("end") ?? today,
            });
          }}
        >
          <SelectTrigger className="w-44" aria-label="Period">
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
        {range === "custom" ? (
          <>
            <Field id="report-start" label="From" className="w-44">
              <DatePicker
                id="report-start"
                value={searchParams.get("start") ?? ""}
                max={searchParams.get("end") ?? undefined}
                onChange={(value) => setParams({ start: value || null })}
              />
            </Field>
            <Field id="report-end" label="To" className="w-44">
              <DatePicker
                id="report-end"
                value={searchParams.get("end") ?? ""}
                min={searchParams.get("start") ?? undefined}
                onChange={(value) => setParams({ end: value || null })}
              />
            </Field>
          </>
        ) : null}
        <Select
          value={interval}
          onValueChange={(value) => setParams({ interval: value === "day" ? null : value })}
        >
          <SelectTrigger className="w-36" aria-label="Group by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTERVALS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {children}
      </div>
      {result.error ? (
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

// --- Summary -----------------------------------------------------------------------------

export interface MetricDefinition<K extends string> {
  key: K;
  label: string;
  description: string;
}

/** A period summary over one metric set (offer metrics or benefit usage, never mixed). */
export interface MetricReport<K extends string> {
  start: string;
  end: string;
  interval: Interval;
  time_zone: string;
  generated_at: string;
  totals: Record<K, number>;
  series: (Record<K, number> & { period_start: string })[];
}

interface SummaryQuery<R> {
  data: R | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

export function OfferSummary({ summary }: { summary: SummaryQuery<OfferReportSummary> }) {
  return <ReportSummary summary={summary} metrics={METRICS} />;
}

/** Totals, one chart per metric and a table view of the same series. */
export function ReportSummary<K extends string>({
  summary,
  metrics,
}: {
  summary: SummaryQuery<MetricReport<K>>;
  metrics: readonly MetricDefinition<K>[];
}) {
  const columns = metrics.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";
  const sort = useSortParam(["period", ...metrics.map((metric) => metric.key)], "series_ordering");
  if (summary.isPending) {
    return (
      <div className="space-y-4">
        <div className={`grid gap-4 ${columns}`}>
          {metrics.map((metric) => (
            <Skeleton key={metric.key} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }
  if (summary.isError || !summary.data) {
    return <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />;
  }
  const report = summary.data;
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {formatCalendarDate(report.start)} – {formatCalendarDate(report.end)} · Dates in{" "}
        {report.time_zone} · Updated {formatDateTime(report.generated_at)}
      </p>
      <Stagger className={`grid gap-4 ${columns}`}>
        {metrics.map((metric) => (
          <StaggerItem key={metric.key}>
            <MetricCard report={report} metric={metric} />
          </StaggerItem>
        ))}
      </Stagger>
      <details className="bg-card shadow-ring overflow-hidden rounded-2xl border">
        <summary className="cursor-pointer px-6 py-3 text-sm font-semibold">View as table</summary>
        <div className="border-t">
          <DataTable
            aria-label="Report series"
            className="rounded-none border-0 shadow-none"
            rows={report.series}
            rowKey={(point) => point.period_start}
            sort={sort}
            columns={[
              {
                id: "period",
                header: bucketHeading(report.interval),
                sortKey: "period",
                sortValue: (point) => point.period_start,
                cell: (point) => bucketLabel(point.period_start, report.interval),
              },
              ...metrics.map((metric) => ({
                id: metric.key,
                header: metric.label,
                sortKey: metric.key,
                sortValue: (point: MetricReport<K>["series"][number]) => point[metric.key],
                className: "text-right",
                cellClassName: "tabular-nums",
                cell: (point: MetricReport<K>["series"][number]) => point[metric.key],
              })),
            ]}
          />
        </div>
      </details>
    </div>
  );
}

function bucketHeading(interval: Interval) {
  return interval === "month" ? "Month" : interval === "week" ? "Week starting" : "Day";
}

function bucketLabel(date: string, interval: Interval) {
  if (interval === "month") return formatCalendarDate(date, "month");
  if (interval === "week") return `Week of ${formatCalendarDate(date, "short")}`;
  return formatCalendarDate(date);
}

const numberFormat = new Intl.NumberFormat();

/**
 * One metric: its total as the headline and its series as bars. Metrics have very different
 * scales (views dwarf redemptions), so each gets its own chart rather than a shared axis.
 */
function MetricCard<K extends string>({
  report,
  metric,
}: {
  report: MetricReport<K>;
  metric: MetricDefinition<K>;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const point = hovered === null ? undefined : report.series[hovered];
  return (
    <Card>
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{metric.label}</CardTitle>
        <p className="text-3xl font-medium tabular-nums">
          {numberFormat.format(report.totals[metric.key])}
        </p>
        <p className="text-muted-foreground text-xs">{metric.description}</p>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* The hover readout: the tooltip, placed in flow so it never covers the bars. */}
        <p className="text-muted-foreground h-5 text-xs" aria-live="polite">
          {point
            ? `${bucketLabel(point.period_start, report.interval)}: ${numberFormat.format(point[metric.key])}`
            : ""}
        </p>
        <BarSeries
          label={`${metric.label} per ${report.interval}`}
          values={report.series.map((p) => p[metric.key])}
          onHover={setHovered}
        />
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>
            {bucketLabel(report.series[0]?.period_start ?? report.start, report.interval)}
          </span>
          <span>
            {bucketLabel(report.series.at(-1)?.period_start ?? report.end, report.interval)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

const CHART_HEIGHT = 112;
const RADIUS = 4;

/** Single-series bars in pixel space (so rounded ends stay round), anchored to the baseline. */
export function BarSeries({
  label,
  values,
  onHover,
}: {
  label: string;
  values: number[];
  onHover: (index: number | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const max = Math.max(0, ...values);
  const count = Math.max(values.length, 1);
  const slot = width / count;
  const gap = slot > 6 ? 2 : 0;
  const barWidth = Math.max(slot - gap, 1);

  return (
    <div ref={ref} className="w-full" onMouseLeave={() => onHover(null)}>
      {width > 0 ? (
        <svg
          width={width}
          height={CHART_HEIGHT}
          role="img"
          aria-label={`${label}: peak ${max}. Use “View as table” for every value.`}
          className="block overflow-visible"
        >
          {max > 0 ? (
            <text x={0} y={10} className="fill-muted-foreground text-xs">
              {numberFormat.format(max)}
            </text>
          ) : null}
          <line
            x1={0}
            x2={width}
            y1={CHART_HEIGHT - 0.5}
            y2={CHART_HEIGHT - 0.5}
            className="stroke-border"
          />
          {values.map((value, index) => {
            const x = index * slot + gap / 2;
            const height =
              max > 0 ? Math.max((value / max) * (CHART_HEIGHT - 16), value ? 2 : 0) : 0;
            return (
              <g key={index} onMouseEnter={() => onHover(index)}>
                {/* Hit target: the whole column, larger than the bar. */}
                <rect
                  x={index * slot}
                  y={0}
                  width={slot}
                  height={CHART_HEIGHT}
                  className="fill-transparent"
                />
                {height > 0 ? (
                  <path
                    d={roundedTop(x, CHART_HEIGHT - height, barWidth, height)}
                    className="fill-primary"
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
      ) : (
        <div className="h-28" />
      )}
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number): string {
  const r = Math.min(RADIUS, w / 2, h);
  return (
    `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}` +
    `H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
  );
}

function useWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/** Ads are a separate metric set (never blended with offers) that the API does not have yet. */
export function AdsNotAvailable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ad performance</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Ad impressions and clicks are reported on each advertisement&apos;s page (Delivery),
          separately from offers. They are never added to offer numbers.
        </p>
      </CardContent>
    </Card>
  );
}
