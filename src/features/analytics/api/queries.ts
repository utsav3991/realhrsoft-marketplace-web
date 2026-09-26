import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SortOrdering } from "@/design-system/components/data-table";
import { organizationHeader } from "@/features/offers/api/queries";
import { api, unwrap, type Page, type Schemas } from "@/shared/api";

import type { ReportPeriod } from "./period";

export type OfferReportSummary = Schemas["OfferReportSummary"];
export type PartnerOfferReport = Schemas["PartnerOfferReport"];
export type AdminOfferReport = Schemas["AdminOfferReport"];
export type EmployerReportRow = Schemas["EmployerReportRow"];
export type Metrics = Schemas["Metrics"];
export type BenefitReportSummary = Schemas["BenefitReportSummary"];
export type BenefitReportRow = Schemas["BenefitReportRow"];

/** Report columns the API sorts by (`ordering`); without one, most claims come first. */
export const OFFER_REPORT_SORTS = ["title", "views", "claims", "redemptions"] as const;
export type Ordering = SortOrdering<(typeof OFFER_REPORT_SORTS)[number]>;
export const EMPLOYER_REPORT_SORTS = ["views", "claims", "redemptions"] as const;
export type EmployerOrdering = SortOrdering<(typeof EMPLOYER_REPORT_SORTS)[number]>;

/** Benefit usage has its own metric set and orderings; it is never mixed with offer metrics. */
export const BENEFIT_REPORT_SORTS = ["title", "claims", "employees"] as const;
export type BenefitOrdering = SortOrdering<(typeof BENEFIT_REPORT_SORTS)[number]>;

/** Administrator filters. The employer filter never reaches the partner endpoints. */
export interface AdminReportFilters {
  offerId: string | null;
  partnerId: string | null;
  organizationId: string | null;
}

export const analyticsKeys = {
  all: ["analytics"] as const,
  partner: (organizationId: string) => [...analyticsKeys.all, "partner", organizationId] as const,
  partnerSummary: (organizationId: string, period: ReportPeriod, offerId: string | null) =>
    [...analyticsKeys.partner(organizationId), "summary", period, offerId] as const,
  partnerOffers: (
    organizationId: string,
    period: ReportPeriod,
    ordering: Ordering | null,
    page: Page,
  ) =>
    [
      ...analyticsKeys.partner(organizationId),
      "offers",
      period.start,
      period.end,
      ordering,
      page,
    ] as const,
  employer: (organizationId: string) => [...analyticsKeys.all, "employer", organizationId] as const,
  employerSummary: (organizationId: string, period: ReportPeriod, benefitId: string | null) =>
    [...analyticsKeys.employer(organizationId), "summary", period, benefitId] as const,
  employerBenefits: (
    organizationId: string,
    period: ReportPeriod,
    ordering: BenefitOrdering | null,
    page: Page,
  ) =>
    [
      ...analyticsKeys.employer(organizationId),
      "benefits",
      period.start,
      period.end,
      ordering,
      page,
    ] as const,
  admin: () => [...analyticsKeys.all, "admin"] as const,
  adminSummary: (period: ReportPeriod, filters: AdminReportFilters) =>
    [...analyticsKeys.admin(), "summary", period, filters] as const,
  adminOffers: (
    period: ReportPeriod,
    filters: AdminReportFilters,
    ordering: Ordering | null,
    page: Page,
  ) =>
    [
      ...analyticsKeys.admin(),
      "offers",
      period.start,
      period.end,
      filters,
      ordering,
      page,
    ] as const,
  adminEmployers: (
    period: ReportPeriod,
    filters: AdminReportFilters,
    ordering: EmployerOrdering | null,
    page: Page,
  ) =>
    [
      ...analyticsKeys.admin(),
      "employers",
      period.start,
      period.end,
      filters,
      ordering,
      page,
    ] as const,
};

// Counts are live, so a period change keeps the previous figures on screen while refetching.
const live = { placeholderData: keepPreviousData } as const;

// --- Partner portal (the selected organization; totals only) -----------------------------

export function usePartnerOfferSummary(
  organizationId: string,
  period: ReportPeriod,
  offerId: string | null,
) {
  return useQuery({
    ...live,
    queryKey: analyticsKeys.partnerSummary(organizationId, period, offerId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/partner/analytics/offers/summary", {
          params: {
            header: organizationHeader(organizationId),
            query: { ...period, offer_id: offerId ?? undefined },
          },
          signal,
        }),
      ),
  });
}

export function usePartnerOfferReport(
  organizationId: string,
  period: ReportPeriod,
  ordering: Ordering | null,
  page: Page,
) {
  return useQuery({
    ...live,
    queryKey: analyticsKeys.partnerOffers(organizationId, period, ordering, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/partner/analytics/offers", {
          params: {
            header: organizationHeader(organizationId),
            query: {
              start: period.start,
              end: period.end,
              ordering: ordering ? [ordering] : undefined,
              offset: page.offset,
              limit: page.limit,
            },
          },
          signal,
        }),
      ),
  });
}

// --- Employer portal (the selected organization; counts, no employee identity) ----------

export function useEmployerBenefitSummary(
  organizationId: string,
  period: ReportPeriod,
  benefitId: string | null,
) {
  return useQuery({
    ...live,
    queryKey: analyticsKeys.employerSummary(organizationId, period, benefitId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/employer/analytics/benefits/summary", {
          params: {
            header: organizationHeader(organizationId),
            query: { ...period, benefit_id: benefitId ?? undefined },
          },
          signal,
        }),
      ),
  });
}

export function useEmployerBenefitReport(
  organizationId: string,
  period: ReportPeriod,
  ordering: BenefitOrdering | null,
  page: Page,
) {
  return useQuery({
    ...live,
    queryKey: analyticsKeys.employerBenefits(organizationId, period, ordering, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/employer/analytics/benefits", {
          params: {
            header: organizationHeader(organizationId),
            query: {
              start: period.start,
              end: period.end,
              ordering: ordering ? [ordering] : undefined,
              offset: page.offset,
              limit: page.limit,
            },
          },
          signal,
        }),
      ),
  });
}

// --- Aayulogic administration ------------------------------------------------------------

function adminQuery(filters: AdminReportFilters) {
  return {
    offer_id: filters.offerId ?? undefined,
    partner_id: filters.partnerId ?? undefined,
    organization_id: filters.organizationId ?? undefined,
  };
}

export function useAdminOfferSummary(period: ReportPeriod, filters: AdminReportFilters) {
  return useQuery({
    ...live,
    queryKey: analyticsKeys.adminSummary(period, filters),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/analytics/offers/summary", {
          params: { query: { ...period, ...adminQuery(filters) } },
          signal,
        }),
      ),
  });
}

export function useAdminOfferReport(
  period: ReportPeriod,
  filters: AdminReportFilters,
  ordering: Ordering | null,
  page: Page,
) {
  return useQuery({
    ...live,
    queryKey: analyticsKeys.adminOffers(period, filters, ordering, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/analytics/offers", {
          params: {
            query: {
              start: period.start,
              end: period.end,
              ...adminQuery(filters),
              ordering: ordering ? [ordering] : undefined,
              offset: page.offset,
              limit: page.limit,
            },
          },
          signal,
        }),
      ),
  });
}

export function useEmployerReport(
  period: ReportPeriod,
  filters: AdminReportFilters,
  ordering: EmployerOrdering | null,
  page: Page,
) {
  return useQuery({
    ...live,
    queryKey: analyticsKeys.adminEmployers(period, filters, ordering, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/analytics/offers/by-employer", {
          params: {
            query: {
              start: period.start,
              end: period.end,
              ...adminQuery(filters),
              ordering: ordering ? [ordering] : undefined,
              offset: page.offset,
              limit: page.limit,
            },
          },
          signal,
        }),
      ),
  });
}
