"use client";

import type { ReactNode } from "react";

import type {
  DataTableColumn,
  DataTableColumns,
  DataTableSort,
} from "@/design-system/components/data-table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/design-system/primitives/tooltip";
import { QueryDataTable, type ResultsQuery } from "@/shared/components/query-data-table";
import { StatusBadge } from "@/shared/components/status-badge";
import type { PageState } from "@/shared/hooks/use-page-param";

import type { PartnerOfferReport } from "../api/queries";
import { METRICS, type MetricDefinition } from "./offer-performance";

const numberFormat = new Intl.NumberFormat();

/** A paginated report as a table: loading, error, empty, sorting and pages come with it. */
export function ReportTable<T>({
  query,
  paging,
  sort,
  empty,
  columns,
  rowKey,
  label,
}: {
  query: ResultsQuery<T>;
  paging: PageState;
  sort: DataTableSort;
  empty: ReactNode;
  columns: DataTableColumns<T>;
  rowKey: (row: T) => string;
  label: string;
}) {
  return (
    <QueryDataTable
      aria-label={label}
      query={query}
      paging={paging}
      sort={sort}
      columns={columns}
      rowKey={rowKey}
      skeletonRows={3}
      className="rounded-lg"
      empty={empty}
    />
  );
}

/**
 * One right-aligned, sortable numeric column per metric. The header explains the metric on
 * hover; the same explanation is printed under each chart.
 */
export function metricColumns<K extends string>(
  metrics: readonly MetricDefinition<K>[],
): DataTableColumn<Record<K, number>>[] {
  return metrics.map((metric) => ({
    id: metric.key,
    sortKey: metric.key,
    header: (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="decoration-muted-foreground/60 cursor-help underline decoration-dotted underline-offset-4">
            {metric.label}
          </span>
        </TooltipTrigger>
        <TooltipContent>{metric.description}</TooltipContent>
      </Tooltip>
    ),
    className: "text-right",
    cellClassName: "tabular-nums",
    cell: (row) => numberFormat.format(row[metric.key]),
  }));
}

export const ACTIONS_HEADER = <span className="sr-only">Actions</span>;

/** Per-offer rows; administrators pass `partner` to add the partner column. */
export function OfferRows<T extends PartnerOfferReport>({
  query,
  paging,
  sort,
  empty,
  title,
  partner,
  action,
}: {
  query: ResultsQuery<T>;
  paging: PageState;
  sort: DataTableSort;
  empty: ReactNode;
  title?: (row: T) => ReactNode;
  partner?: (row: T) => ReactNode;
  action?: (row: T) => ReactNode;
}) {
  const columns: DataTableColumns<T> = [
    {
      id: "offer",
      header: "Offer",
      sortKey: "title",
      cellClassName: "font-medium",
      cell: (row) => (title ? title(row) : row.title),
    },
    partner && { id: "partner", header: "Partner", cell: partner },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge domain="offer" status={row.display_status} />,
    },
    ...metricColumns(METRICS),
    action && { id: "actions", header: ACTIONS_HEADER, className: "text-right", cell: action },
  ];
  return (
    <ReportTable
      label="Offers"
      query={query}
      paging={paging}
      sort={sort}
      columns={columns}
      rowKey={(row) => row.offer_id}
      empty={empty}
    />
  );
}
