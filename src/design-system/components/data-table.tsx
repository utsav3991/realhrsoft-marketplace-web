"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/design-system/primitives/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/primitives/select";
import { Skeleton } from "@/design-system/primitives/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  tableRowClassName,
} from "@/design-system/primitives/table";
import { cn } from "@/shared/lib/cn";

import { EASE_OUT, FadeIn, useEntryInitial } from "./motion";

export interface DataTableColumn<T> {
  id: string;
  /** Header content. Use `<span className="sr-only">…</span>` for an actions column. */
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Header and cells: alignment (`text-right`), width, `hidden md:table-cell`. */
  className?: string;
  /** Cells only, e.g. `text-muted-foreground`. */
  cellClassName?: string;
  /**
   * Makes the header a sort toggle when the table has `sort`: the ordering the API accepts
   * (`claimed_at`, sent as `claimed_at`/`-claimed_at`).
   */
  sortKey?: string;
  /** Sorts in the browser instead of the API. Only for tables that hold every row. */
  sortValue?: (row: T) => string | number | null | undefined;
}

/** `false`/`null`/`undefined` entries drop out, so optional columns read `cond && {…}`. */
export type DataTableColumns<T> = readonly (DataTableColumn<T> | false | null | undefined)[];

/** `key` ascending, `-key` descending, `null` for the default order. */
export type SortOrdering<K extends string = string> = K | `-${K}`;

export interface DataTableSort<K extends string = string> {
  value: SortOrdering<K> | null;
  onChange(value: SortOrdering<K> | null): void;
}

/** Server pages over a list; `rows` holds the current page only. */
export interface DataTablePagination {
  /** 1-based. */
  page: number;
  pageSize: number;
  /** Rows across all pages. */
  total: number;
  pageSizes: readonly number[];
  onPageChange(page: number): void;
  onPageSizeChange(pageSize: number): void;
}

/** Tables that hold every row page them in the browser with these sizes. */
const LOCAL_PAGE_SIZES = [10, 20, 50, 100] as const;
const LOCAL_PAGE_SIZE = 10;

export interface DataTableProps<T> {
  columns: DataTableColumns<T>;
  rows: readonly T[];
  rowKey: (row: T) => string;
  /** Skeleton rows under the real headers, so the layout does not jump when data lands. */
  loading?: boolean;
  skeletonRows?: number;
  /** Rendered instead of the table, e.g. `<ErrorState>`. */
  error?: ReactNode;
  /** Rendered instead of the table when there are no rows. */
  empty?: ReactNode;
  /** Server pages. Without it, more rows than one page are paged in the browser. */
  pagination?: DataTablePagination;
  /** A new page is loading behind the rows shown. */
  busy?: boolean;
  /** Current ordering (usually a URL param) for the columns with a `sortKey`. */
  sort?: DataTableSort;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
  rowClassName?: (row: T) => string | undefined;
}

/** Rows of one batch cascade in; later rows share the last delay so long lists stay quick. */
const ROW_STAGGER = 0.025;
const MAX_STAGGERED_ROWS = 10;

/**
 * The marketplace's one table: typed columns over the `Table` primitive with loading, empty,
 * error, sorting and Prev/Next page states. Data fetching stays with the caller
 * (`QueryDataTable` wires one TanStack query per page).
 */
export function DataTable<T>({
  columns: columnsWithGaps,
  rows,
  rowKey,
  loading = false,
  skeletonRows = 5,
  error,
  empty,
  pagination,
  busy = false,
  sort,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className,
  rowClassName,
}: DataTableProps<T>) {
  const rowInitial = useEntryInitial({ opacity: 0, y: 4 });
  const columns = columnsWithGaps.filter((column): column is DataTableColumn<T> => Boolean(column));
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState<number>(LOCAL_PAGE_SIZE);
  const sortedRows = sortRows(rows, columns, sort?.value ?? null);
  const localPageCount = Math.max(1, Math.ceil(sortedRows.length / localPageSize));
  const currentLocalPage = Math.min(localPage, localPageCount);
  const pager: DataTablePagination =
    pagination ??
    ({
      page: currentLocalPage,
      pageSize: localPageSize,
      total: sortedRows.length,
      pageSizes: LOCAL_PAGE_SIZES,
      onPageChange: setLocalPage,
      onPageSizeChange(size) {
        setLocalPageSize(size);
        setLocalPage(1);
      },
    } satisfies DataTablePagination);
  const visibleRows = pagination
    ? sortedRows
    : sortedRows.slice((currentLocalPage - 1) * localPageSize, currentLocalPage * localPageSize);

  if (!loading && error) return <FadeIn>{error}</FadeIn>;
  if (!loading && rows.length === 0 && empty) return <FadeIn>{empty}</FadeIn>;

  return (
    <div className={cn("bg-card shadow-ring overflow-hidden rounded-2xl border", className)}>
      <Table
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-busy={loading || busy || undefined}
      >
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => {
              const sortKey = sort ? column.sortKey : undefined;
              const direction = sort && sortKey ? sortDirection(sort.value, sortKey) : null;
              return (
                <TableHead
                  key={column.id}
                  className={column.className}
                  aria-sort={direction ? ARIA_SORT[direction] : undefined}
                >
                  {sort && sortKey ? (
                    <SortButton
                      direction={direction}
                      onClick={() => sort.onChange(nextOrdering(sort.value, sortKey))}
                    >
                      {column.header}
                    </SortButton>
                  ) : (
                    column.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody className={cn(busy && "opacity-60 transition-opacity")}>
          {loading
            ? Array.from({ length: skeletonRows }, (_, index) => (
                <TableRow key={index} className="hover:bg-transparent">
                  {columns.map((column) => (
                    <TableCell key={column.id} className={column.className}>
                      <Skeleton className="h-5 w-full min-w-12" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : visibleRows.map((row, index) => (
                <motion.tr
                  key={rowKey(row)}
                  data-slot="table-row"
                  className={cn(tableRowClassName, rowClassName?.(row))}
                  initial={rowInitial}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    ease: EASE_OUT,
                    delay: Math.min(index, MAX_STAGGERED_ROWS) * ROW_STAGGER,
                  }}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={cn(column.className, column.cellClassName)}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </motion.tr>
              ))}
        </TableBody>
      </Table>
      {!loading && (pager.total > 0 || pager.page > 1) ? (
        <DataTablePager pagination={pager} />
      ) : null}
    </div>
  );
}

type SortDirection = "asc" | "desc";

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

function sortDirection(value: string | null, key: string): SortDirection | null {
  if (value === key) return "asc";
  if (value === `-${key}`) return "desc";
  return null;
}

/** Ascending, then descending, then back to the default order. */
function nextOrdering(value: string | null, key: string): string | null {
  const direction = sortDirection(value, key);
  if (direction === null) return key;
  return direction === "asc" ? `-${key}` : null;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** Browser-side order for a column with `sortValue`; blanks last either way, like the API. */
function sortRows<T>(
  rows: readonly T[],
  columns: readonly DataTableColumn<T>[],
  value: string | null,
): readonly T[] {
  if (!value) return rows;
  const key = value.replace(/^-/, "");
  const sortValue = columns.find((column) => column.sortKey === key)?.sortValue;
  if (!sortValue) return rows;
  const sign = value.startsWith("-") ? -1 : 1;
  return [...rows].sort((a, b) => {
    const left = sortValue(a);
    const right = sortValue(b);
    const leftBlank = left === null || left === undefined || left === "";
    const rightBlank = right === null || right === undefined || right === "";
    if (leftBlank || rightBlank) return Number(leftBlank) - Number(rightBlank);
    if (typeof left === "number" && typeof right === "number") return sign * (left - right);
    return sign * collator.compare(String(left), String(right));
  });
}

function SortButton({
  direction,
  onClick,
  children,
}: {
  direction: SortDirection | null;
  onClick: () => void;
  children: ReactNode;
}) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-foreground/5 hover:text-foreground focus-visible:ring-ring/50 -mx-2 inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold outline-none focus-visible:ring-[3px]"
    >
      {children}
      <Icon
        aria-hidden
        className={cn("size-3.5", direction ? "text-foreground" : "text-muted-foreground")}
      />
    </button>
  );
}

const countFormat = new Intl.NumberFormat();

/** "Showing 1-10 of 120 results", rows per page and Prev/Next, as in the SHMS frontend. */
function DataTablePager({ pagination }: { pagination: DataTablePagination }) {
  const { page, pageSize, total, pageSizes, onPageChange, onPageSizeChange } = pagination;
  const pageCount = Math.ceil(total / pageSize);
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-col gap-3 border-t px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <p className="text-muted-foreground text-sm font-medium tabular-nums" aria-live="polite">
          {total > 0
            ? `Showing ${countFormat.format(first)}-${countFormat.format(last)} of ${countFormat.format(total)} results`
            : "No results"}
        </p>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="h-9 w-auto gap-2" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizes.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <nav aria-label="Pagination" className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="w-full sm:w-auto"
        >
          <ChevronLeft aria-hidden />
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="w-full sm:w-auto"
        >
          Next
          <ChevronRight aria-hidden />
        </Button>
      </nav>
    </div>
  );
}
