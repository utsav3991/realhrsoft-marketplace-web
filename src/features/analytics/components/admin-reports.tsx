"use client";

import { Building2, ChartColumn, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { EmptyState } from "@/design-system/components/empty-state";
import { Badge } from "@/design-system/primitives/badge";
import { Button } from "@/design-system/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/primitives/card";
import { isUuid } from "@/shared/api";
import {
  OfferAdminPermission,
  OrganizationAdminPermission,
  PartnerAdminPermission,
  useCan,
} from "@/shared/authorization";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { OrganizationFilter } from "@/features/organizations/components/organization-filter";
import { PartnerFilter } from "@/features/partners/components/partner-filter";

import type { ReportPeriod } from "../api/period";
import {
  EMPLOYER_REPORT_SORTS,
  OFFER_REPORT_SORTS,
  useAdminOfferReport,
  useAdminOfferSummary,
  useEmployerReport,
  type AdminOfferReport,
  type AdminReportFilters,
} from "../api/queries";
import {
  AdsNotAvailable,
  METRICS,
  OfferSummary,
  PeriodControls,
  usePeriod,
  useSetParams,
} from "./offer-performance";
import { ACTIONS_HEADER, metricColumns, OfferRows, ReportTable } from "./report-tables";

/** Identifier filters set from the tables below or links elsewhere, shown as removable chips. */
const ID_FILTERS = [{ param: "offer_id", key: "offerId", label: "Offer" }] as const;

const uuidParam = (value: string | null) => (value && isUuid(value) ? value : null);

/** Marketplace-wide offer performance (analytics.offer_report.view). */
export function AdminReports() {
  const { period } = usePeriod();
  return (
    <div className="space-y-6">
      <PeriodControls>
        <FilterChips />
      </PeriodControls>
      {period ? <Report period={period} /> : null}
      <AdsNotAvailable />
    </div>
  );
}

function useFilters(): AdminReportFilters {
  const searchParams = useSearchParams();
  return {
    offerId: uuidParam(searchParams.get("offer_id")),
    partnerId: uuidParam(searchParams.get("partner_id")),
    organizationId: uuidParam(searchParams.get("organization_id")),
  };
}

/** Partner and employer pickers, then chips for the identifier filters. */
function FilterChips() {
  const filters = useFilters();
  const setParams = useSetParams();
  return [
    <PartnerFilter
      key="partner"
      value={filters.partnerId}
      onChange={(id) => setParams({ partner_id: id })}
    />,
    <OrganizationFilter
      key="employer"
      label="Employer"
      allLabel="All employers"
      value={filters.organizationId}
      onChange={(id) => setParams({ organization_id: id })}
    />,
    ...ID_FILTERS.map(({ param, key, label }) =>
      filters[key] ? (
        <Badge key={param} intent="outline" className="gap-1.5 py-1.5 pr-1.5">
          {label}: <span className="font-mono">{filters[key]?.slice(0, 8)}…</span>
          <button
            type="button"
            className="hover:bg-secondary rounded-full p-0.5"
            aria-label={`Clear ${label.toLowerCase()} filter`}
            onClick={() => setParams({ [param]: null })}
          >
            <X aria-hidden />
          </button>
        </Badge>
      ) : null,
    ),
  ];
}

function Report({ period }: { period: ReportPeriod }) {
  const setParams = useSetParams();
  const filters = useFilters();
  const sort = useSortParam(OFFER_REPORT_SORTS);
  const paging = usePageParam();
  const employerSort = useSortParam(EMPLOYER_REPORT_SORTS, "employer_ordering");
  const employerPaging = usePageParam("employer_");
  const summary = useAdminOfferSummary(period, filters);
  const offers = useAdminOfferReport(period, filters, sort.value, paging);
  const employers = useEmployerReport(period, filters, employerSort.value, employerPaging);
  const canViewOffers = useCan(OfferAdminPermission.OFFER_VIEW);
  const canViewPartners = useCan(PartnerAdminPermission.PARTNER_VIEW);
  const canViewOrganizations = useCan(OrganizationAdminPermission.ORGANIZATION_VIEW);
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-labelledby="offer-performance">
        <h2 id="offer-performance" className="text-lg font-medium">
          Offer performance
        </h2>
        <OfferSummary summary={summary} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>By offer</CardTitle>
          <CardDescription>
            Offers with at least one view, claim or redemption in the period. Filter by an offer or
            partner to narrow every section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OfferRows<AdminOfferReport>
            query={offers}
            paging={paging}
            sort={sort}
            empty={
              <EmptyState
                icon={ChartColumn}
                title="No activity in this period"
                description={filtered ? "Try different filters." : undefined}
                className="py-8"
              />
            }
            title={(row) =>
              canViewOffers ? (
                <Link href={`/admin/offers/${row.offer_id}`} className="hover:underline">
                  {row.title}
                </Link>
              ) : (
                row.title
              )
            }
            partner={(row) =>
              canViewPartners ? (
                <Link href={`/admin/partners/${row.partner_id}`} className="hover:underline">
                  {row.partner_name}
                </Link>
              ) : (
                row.partner_name
              )
            }
            action={(row) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={filters.offerId === row.offer_id}
                  onClick={() => setParams({ offer_id: row.offer_id })}
                >
                  This offer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={filters.partnerId === row.partner_id}
                  onClick={() => setParams({ partner_id: row.partner_id })}
                >
                  This partner
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By employer</CardTitle>
          <CardDescription>
            Where the viewing and claiming employees work, by their employer at the time. Only
            administrators see this breakdown; partners get totals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportTable
            label="Employers"
            query={employers}
            paging={employerPaging}
            sort={employerSort}
            rowKey={(row) => row.organization_id}
            empty={
              <EmptyState
                icon={Building2}
                title="No employee activity in this period"
                className="py-8"
              />
            }
            columns={[
              {
                id: "employer",
                header: "Employer",
                cellClassName: "font-medium",
                cell: (row) =>
                  canViewOrganizations ? (
                    <Link
                      href={`/admin/organizations/${row.organization_id}`}
                      className="hover:underline"
                    >
                      {row.organization_name}
                    </Link>
                  ) : (
                    row.organization_name
                  ),
              },
              ...metricColumns(METRICS),
              {
                id: "actions",
                header: ACTIONS_HEADER,
                className: "text-right",
                cell: (row) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={filters.organizationId === row.organization_id}
                    onClick={() => setParams({ organization_id: row.organization_id })}
                  >
                    This employer
                  </Button>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
