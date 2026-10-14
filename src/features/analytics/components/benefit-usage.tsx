"use client";

import { ChartColumn, X } from "lucide-react";
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
import { DataTable } from "@/design-system/components/data-table";
import { isUuid } from "@/shared/api";
import { useSession } from "@/shared/auth";
import { StatusBadge } from "@/shared/components/status-badge";
import { ErrorState } from "@/shared/feedback/states";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { resultRows } from "@/shared/components/query-data-table";

import type { ReportPeriod } from "../api/period";
import {
  BENEFIT_REPORT_SORTS,
  useBenefitUsageReport,
  useBenefitUsageSummary,
  useClientBenefitCompanies,
  type BenefitCompanyRow,
  type BenefitReportOwner,
  type BenefitReportRow,
} from "../api/queries";
import {
  PeriodControls,
  ReportSummary,
  usePeriod,
  useSetParams,
  type MetricDefinition,
} from "./offer-performance";
import { ACTIONS_HEADER, metricColumns, ReportTable } from "./report-tables";

type BenefitMetric = "claims" | "employees";

// Benefit usage only: never combined with offer views, claims or redemptions (RULE-05).
export const BENEFIT_METRICS: readonly MetricDefinition<BenefitMetric>[] = [
  {
    key: "claims",
    label: "Claims",
    description:
      "Uses of your benefits in the period; one employee can use a benefit more than once.",
  },
  {
    key: "employees",
    label: "Employees",
    description: "Different employees who used at least one benefit in the period.",
  },
];

/**
 * H03: how often employees used the selected company's own benefits
 * (analytics.benefit_report.view), or with `scope="client"` the selected client's benefits
 * across its companies (analytics.client_benefit_report.view), with a per-company table.
 * Counts only: no employee identity, no exports.
 */
export function BenefitUsage({ scope = "organization" }: { scope?: BenefitReportOwner["kind"] }) {
  const { period } = usePeriod();
  const { actor } = useSession();
  const id = scope === "client" ? actor?.client?.id : actor?.organization?.id;
  if (!id) throw new Error("BenefitUsage needs a selected organization or client");
  return (
    <div className="space-y-6">
      <PeriodControls />
      {period ? <BenefitReport period={period} owner={{ kind: scope, id }} /> : null}
    </div>
  );
}

function BenefitReport({ period, owner }: { period: ReportPeriod; owner: BenefitReportOwner }) {
  const searchParams = useSearchParams();
  const setParams = useSetParams();
  const rawBenefit = searchParams.get("benefit_id");
  const benefitId = rawBenefit && isUuid(rawBenefit) ? rawBenefit : null;
  const sort = useSortParam(BENEFIT_REPORT_SORTS);
  const paging = usePageParam();
  const summary = useBenefitUsageSummary(owner, period, benefitId);
  const benefits = useBenefitUsageReport(owner, period, sort.value, paging);
  const selected = resultRows(benefits).find((row) => row.benefit_id === benefitId);

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-labelledby="benefit-usage">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="benefit-usage" className="text-lg font-medium">
            Benefit usage
          </h2>
          {benefitId ? (
            <Badge intent="outline" className="gap-1.5 py-1.5 pr-1.5">
              {selected ? selected.title : "One benefit"}
              <button
                type="button"
                className="hover:bg-secondary rounded-full p-0.5"
                aria-label="Show all benefits"
                onClick={() => setParams({ benefit_id: null })}
              >
                <X aria-hidden />
              </button>
            </Badge>
          ) : null}
        </div>
        <ReportSummary summary={summary} metrics={BENEFIT_METRICS} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>By benefit</CardTitle>
          <CardDescription>
            Benefits used at least once in the period, including ones since retired or suspended.
            Select one to see its trend above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportTable<BenefitReportRow>
            label="Benefits"
            query={benefits}
            paging={paging}
            sort={sort}
            rowKey={(row) => row.benefit_id}
            empty={
              <EmptyState
                icon={ChartColumn}
                title="No benefit use in this period"
                description="Each time an employee uses one of your benefits, it is counted here."
                className="py-8"
              />
            }
            columns={[
              {
                id: "benefit",
                header: "Benefit",
                sortKey: "title",
                cellClassName: "font-medium",
                cell: (row) => row.title,
              },
              {
                id: "status",
                header: "Status",
                cell: (row) => <StatusBadge domain="benefit" status={row.display_status} />,
              },
              ...metricColumns(BENEFIT_METRICS),
              {
                id: "actions",
                header: ACTIONS_HEADER,
                className: "text-right",
                cell: (row) =>
                  row.benefit_id === benefitId ? (
                    <span className="text-muted-foreground text-xs">Shown above</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setParams({ benefit_id: row.benefit_id })}
                    >
                      Show trend
                    </Button>
                  ),
              },
            ]}
          />
        </CardContent>
      </Card>

      {owner.kind === "client" ? (
        <CompanyUsage clientId={owner.id} period={period} benefitId={benefitId} />
      ) : null}
    </div>
  );
}

/** Usage per company of a client's benefits: where each use was made for. */
function CompanyUsage({
  clientId,
  period,
  benefitId,
}: {
  clientId: string;
  period: ReportPeriod;
  benefitId: string | null;
}) {
  const companies = useClientBenefitCompanies(clientId, period, benefitId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>By company</CardTitle>
        <CardDescription>
          Companies whose employees used {benefitId ? "this benefit" : "your benefits"} in the
          period, most used first. Employees are counted once per company.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable<BenefitCompanyRow>
          aria-label="Usage by company"
          rows={companies.data ?? []}
          loading={companies.isPending}
          error={
            companies.isError ? (
              <ErrorState error={companies.error} onRetry={() => void companies.refetch()} />
            ) : undefined
          }
          rowKey={(row) => row.organization_id}
          empty={
            <EmptyState
              icon={ChartColumn}
              title="No company used them in this period"
              className="py-8"
            />
          }
          columns={[
            {
              id: "company",
              header: "Company",
              cellClassName: "font-medium",
              cell: (row) => row.name,
            },
            ...metricColumns(BENEFIT_METRICS),
          ]}
        />
      </CardContent>
    </Card>
  );
}
