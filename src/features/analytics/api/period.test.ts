import { describe, expect, it } from "vitest";

import { addDays, periodFrom, reportToday, spanDays } from "./period";

const params = (query: string) => new URLSearchParams(query);
const TODAY = "2026-09-26";

describe("report period", () => {
  it("defaults to the last 30 days, daily", () => {
    expect(periodFrom(params(""), TODAY)).toEqual({
      period: { start: "2026-08-28", end: TODAY, interval: "day" },
    });
  });

  it("reads presets and the interval", () => {
    expect(periodFrom(params("range=7&interval=week"), TODAY).period).toEqual({
      start: "2026-09-20",
      end: TODAY,
      interval: "week",
    });
    // Unknown values fall back to the defaults.
    expect(periodFrom(params("range=bogus&interval=year"), TODAY).period?.interval).toBe("day");
  });

  it("validates custom dates like the API", () => {
    expect(
      periodFrom(params("range=custom&start=2026-09-01&end=2026-09-30"), TODAY).period,
    ).toEqual({
      start: "2026-09-01",
      end: "2026-09-30",
      interval: "day",
    });
    expect(periodFrom(params("range=custom&start=2026-09-30&end=2026-09-01"), TODAY).error).toMatch(
      /must not be after/,
    );
    expect(periodFrom(params("range=custom&start=2025-01-01&end=2026-01-02"), TODAY).error).toMatch(
      /at most 366/,
    );
    expect(periodFrom(params("range=custom&start=2026-09-01"), TODAY).error).toBeDefined();
  });

  it("computes today in the report time zone", () => {
    // 18:16 UTC is already the next day in Kathmandu (+05:45).
    expect(reportToday(new Date("2026-09-01T18:16:00Z"))).toBe("2026-09-02");
    expect(reportToday(new Date("2026-09-01T18:14:00Z"))).toBe("2026-09-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(spanDays("2025-01-01", "2025-12-31")).toBe(365);
  });
});
