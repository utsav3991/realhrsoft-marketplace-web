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
import { NotAPartner, useIsPartner } from "@/features/offers/components/own-offers";
import { isUuid } from "@/shared/api";
import { useSelectedOrganizationId } from "@/shared/auth";
import { usePageParam } from "@/shared/hooks/use-page-param";
import { useSortParam } from "@/shared/hooks/use-sort-param";
import { resultRows } from "@/shared/components/query-data-table";

import type { ReportPeriod } from "../api/period";
import {
  OFFER_REPORT_SORTS,
  usePartnerOfferReport,
  usePartnerOfferSummary,
  type PartnerOfferReport,
} from "../api/queries";
import {
  AdsNotAvailable,
  OfferSummary,
  PeriodControls,
  usePeriod,
  useSetParams,
} from "./offer-performance";
import { OfferRows } from "./report-tables";

/**
 * Offer performance of the selected partner organization (analytics.partner_offer_report.view).
 * Totals only: the API returns no employee identity and no employer breakdown.
 */
export function PartnerAnalytics() {
  const isPartner = useIsPartner();
  const { period } = usePeriod();

  if (!isPartner) {
    return (
      <NotAPartner description="Register the business and pass Aayulogic verification; once employees view and claim your offers, their performance appears here." />
    );
  }
  return (
    <div className="space-y-6">
      <PeriodControls />
      {period ? <PartnerReport period={period} /> : null}
      <AdsNotAvailable />
    </div>
  );
}

function PartnerReport({ period }: { period: ReportPeriod }) {
  const organizationId = useSelectedOrganizationId();
  const searchParams = useSearchParams();
  const setParams = useSetParams();
  const rawOffer = searchParams.get("offer_id");
  const offerId = rawOffer && isUuid(rawOffer) ? rawOffer : null;
  const sort = useSortParam(OFFER_REPORT_SORTS);
  const paging = usePageParam();
  const summary = usePartnerOfferSummary(organizationId, period, offerId);
  const offers = usePartnerOfferReport(organizationId, period, sort.value, paging);
  const selected = resultRows(offers).find((row) => row.offer_id === offerId);

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-labelledby="offer-performance">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="offer-performance" className="text-lg font-medium">
            Offer performance
          </h2>
          {offerId ? (
            <Badge intent="outline" className="gap-1.5 py-1.5 pr-1.5">
              {selected ? selected.title : "One offer"}
              <button
                type="button"
                className="hover:bg-secondary rounded-full p-0.5"
                aria-label="Show all offers"
                onClick={() => setParams({ offer_id: null })}
              >
                <X aria-hidden />
              </button>
            </Badge>
          ) : null}
        </div>
        <OfferSummary summary={summary} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>By offer</CardTitle>
          <CardDescription>
            Offers with at least one view, claim or redemption in the period. Select one to see its
            trend above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OfferRows<PartnerOfferReport>
            query={offers}
            paging={paging}
            sort={sort}
            empty={
              <EmptyState
                icon={ChartColumn}
                title="No activity in this period"
                description="Views, claims and redemptions of your offers appear here."
                className="py-8"
              />
            }
            action={(row) =>
              row.offer_id === offerId ? (
                <span className="text-muted-foreground text-xs">Shown above</span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setParams({ offer_id: row.offer_id })}
                >
                  Show trend
                </Button>
              )
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
