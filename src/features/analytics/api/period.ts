import type { Schemas } from "@/shared/api";

export type Interval = Schemas["IntervalEnum"];

/**
 * The backend counts in its TIME_ZONE (the API echoes it as `time_zone`). Presets compute
 * "today" there too, so "Last 7 days" means the same dates for every viewer.
 */
export const REPORT_TIME_ZONE = "Asia/Kathmandu";
export const MAX_DAYS = 366;

export const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "custom", label: "Custom dates" },
] as const;
export type RangeValue = (typeof RANGES)[number]["value"];

export const INTERVALS: readonly { value: Interval; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

/** Inclusive local dates (YYYY-MM-DD) and the series bucket size. */
export interface ReportPeriod {
  start: string;
  end: string;
  interval: Interval;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** Today's date in the report time zone, as YYYY-MM-DD. */
export function reportToday(now: Date = new Date()): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: REPORT_TIME_ZONE }).format(now);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Inclusive number of days from start to end. */
export function spanDays(start: string, end: string): number {
  return (
    Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS) + 1
  );
}

export function isRange(value: string | null): value is RangeValue {
  return RANGES.some((range) => range.value === value);
}

export function isInterval(value: string | null): value is Interval {
  return INTERVALS.some((interval) => interval.value === value);
}

export type PeriodResult =
  { period: ReportPeriod; error?: never } | { period?: never; error: string };

/**
 * The period the URL describes: ?range=7|30|90|365|custom (default 30), ?start&end for custom
 * dates, ?interval (default day). Mirrors the API's validation so an invalid custom range is
 * reported inline instead of as a failed request.
 */
export function periodFrom(params: URLSearchParams, today: string = reportToday()): PeriodResult {
  const range = params.get("range");
  const rawInterval = params.get("interval");
  const interval: Interval = isInterval(rawInterval) ? rawInterval : "day";
  if (range !== "custom") {
    const days = Number(isRange(range) ? range : "30");
    return { period: { start: addDays(today, -(days - 1)), end: today, interval } };
  }
  const start = params.get("start") ?? "";
  const end = params.get("end") ?? "";
  if (!DATE.test(start) || !DATE.test(end)) return { error: "Choose a start and an end date." };
  if (start > end) return { error: "The start date must not be after the end date." };
  if (spanDays(start, end) > MAX_DAYS) return { error: `Choose at most ${MAX_DAYS} days.` };
  return { period: { start, end, interval } };
}
