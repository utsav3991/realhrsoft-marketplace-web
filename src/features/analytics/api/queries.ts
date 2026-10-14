import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SortOrdering } from "@/design-system/components/data-table";
import { clientHeader, organizationHeader } from "@/features/offers/api/queries";
import { api, unwrap, type Page, type Schemas } from "@/shared/api";

import type { ReportPeriod } from "./period";

export type OfferReportSummary = Schemas["OfferReportSummary"];
export type PartnerOfferReport = Schemas["PartnerOfferReport"];
export type AdminOfferReport = Schemas["AdminOfferReport"];
export type EmployerReportRow = Schemas["EmployerReportRow"];
export type Metrics = Schemas["Metrics"];
export type BenefitReportSummary = Schemas["BenefitReportSummary"];
export type BenefitReportRow = Schemas["BenefitReportRow"];
export type BenefitCompanyRow = Schemas["BenefitCompanyRow"];

/**
 * Whose benefit usage a report reads: a company's own benefits (Employer portal) or a
 * client's benefits across its companies (Client portal).
 */
export type BenefitReportOwner = { kind: "organization" | "client"; id: string };

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
  benefitOwner: (owner: BenefitReportOwner) =>
    [...analyticsKeys.all, "benefits", owner.kind, owner.id] as const,
  benefitSummary: (owner: BenefitReportOwner, period: ReportPeriod, benefitId: string | null) =>
    [...analyticsKeys.benefitOwner(owner), "summary", period, benefitId] as const,
  benefitCompanies: (owner: BenefitReportOwner, period: ReportPeriod, benefitId: string | null) =>
    [...analyticsKeys.benefitOwner(owner), "companies", period, benefitId] as const,
  benefitRows: (
    owner: BenefitReportOwner,
    period: ReportPeriod,
    ordering: BenefitOrdering | null,
    page: Page,
  ) =>
    [
      ...analyticsKeys.benefitOwner(owner),
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

// --- Employer and Client portals (counts, no employee identity) -------------------------

// Literal paths keep every call visible to the contract-coverage test.
export function useBenefitUsageSummary(
  owner: BenefitReportOwner,
  period: ReportPeriod,
  benefitId: string | null,
) {
  return useQuery({
    ...live,
    queryKey: analyticsKeys.benefitSummary(owner, period, benefitId),
    queryFn: ({ signal }) => {
      const query = { ...period, benefit_id: benefitId ?? undefined };
      return unwrap(
        owner.kind === "client"
          ? api.GET("/client/analytics/benefits/summary", {
              params: { header: clientHeader(owner.id), query },
              signal,
            })
          : api.GET("/employer/analytics/benefits/summary", {
              params: { header: organizationHeader(owner.id), query },
              signal,
            }),
      );
    },
  });
}

export function useBenefitUsageReport(
  owner: BenefitReportOwner,
  period: ReportPeriod,
  ordering: BenefitOrdering | null,
  page: Page,
) {
  return useQuery({
    ...live,
    queryKey: analyticsKeys.benefitRows(owner, period, ordering, page),
    queryFn: ({ signal }) => {
      const query = {
        start: period.start,
        end: period.end,
        ordering: ordering ? [ordering] : undefined,
        offset: page.offset,
        limit: page.limit,
      };
      return unwrap(
        owner.kind === "client"
          ? api.GET("/client/analytics/benefits", {
              params: { header: clientHeader(owner.id), query },
              signal,
            })
          : api.GET("/employer/analytics/benefits", {
              params: { header: organizationHeader(owner.id), query },
              signal,
            }),
      );
    },
  });
}

/** A client's benefit usage per company (the company each use was made for). */
export function useClientBenefitCompanies(
  clientId: string,
  period: ReportPeriod,
  benefitId: string | null,
) {
  const owner: BenefitReportOwner = { kind: "client", id: clientId };
  return useQuery({
    ...live,
    queryKey: analyticsKeys.benefitCompanies(owner, period, benefitId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/client/analytics/benefits/companies", {
          params: {
            header: clientHeader(clientId),
            query: { ...period, benefit_id: benefitId ?? undefined },
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
