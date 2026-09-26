"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { DataTable, type DataTableProps } from "@/design-system/components/data-table";
import { PAGE_SIZES } from "@/shared/api";
import { ErrorState } from "@/shared/feedback/states";
import type { PageState } from "@/shared/hooks/use-page-param";

/** One page of an offset-paginated Django list. */
export interface ResultsPage<T> {
  count: number;
  results: T[];
}

export type ResultsQuery<T> = UseQueryResult<ResultsPage<T>>;

/** The row type of a page query, for typing its columns: `DataTableColumns<RowOf<typeof q>>`. */
export type RowOf<Q extends { data?: { results: unknown[] } }> = NonNullable<
  Q["data"]
>["results"][number];

/** The rows of the loaded page. */
export function resultRows<T>(query: ResultsQuery<T>): T[] {
  return query.data?.results ?? [];
}

type QueryDataTableProps<T> = Omit<
  DataTableProps<T>,
  "rows" | "loading" | "error" | "pagination" | "busy"
> & {
  query: ResultsQuery<T>;
  /** The page the query was made for (`usePageParam`). */
  paging: PageState;
  /** Replaces the default `ErrorState`, e.g. the marketplace eligibility explanation. */
  errorState?: (error: unknown, retry: () => void) => ReactNode;
};

/** `DataTable` over one page of a list query: loading, error, empty and Prev/Next pages. */
export function QueryDataTable<T>({ query, paging, errorState, ...props }: QueryDataTableProps<T>) {
  const retry = () => void query.refetch();
  const count = query.data?.count ?? 0;
  const lastPage = Math.max(1, Math.ceil(count / paging.pageSize));
  const beyondLastPage = query.isSuccess && !query.isPlaceholderData && paging.page > lastPage;

  // A page past the end (rows removed, or an edited URL) moves to the last real page.
  useEffect(() => {
    if (beyondLastPage) paging.setPage(lastPage);
  }, [beyondLastPage, lastPage, paging]);

  return (
    <DataTable
      {...props}
      rows={resultRows(query)}
      loading={query.isPending || beyondLastPage}
      busy={query.isPlaceholderData}
      error={
        query.isError
          ? (errorState?.(query.error, retry) ?? <ErrorState error={query.error} onRetry={retry} />)
          : undefined
      }
      pagination={{
        page: paging.page,
        pageSize: paging.pageSize,
        total: count,
        pageSizes: PAGE_SIZES,
        onPageChange: paging.setPage,
        onPageSizeChange: paging.setPageSize,
      }}
    />
  );
}
