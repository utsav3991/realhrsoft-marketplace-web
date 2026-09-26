"use client";

import { PAGE_SIZES, TABLE_PAGE_SIZE, type Page } from "@/shared/api";

import { useUrlParams } from "./use-url-params";

export interface PageState extends Page {
  /** 1-based. */
  page: number;
  pageSize: number;
  setPage(page: number): void;
  setPageSize(pageSize: number): void;
}

function positive(value: string | null): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

/**
 * A table's page and page size as URL params (`?page=3&page_size=20`). `prefix` keeps two
 * tables on one page apart (`employments_page`). Out-of-range values read as the defaults.
 */
export function usePageParam(prefix = ""): PageState {
  const { searchParams, set } = useUrlParams();
  const pageName = `${prefix}page`;
  const sizeName = `${prefix}page_size`;
  const page = positive(searchParams.get(pageName)) ?? 1;
  const requestedSize = positive(searchParams.get(sizeName));
  const pageSize = PAGE_SIZES.find((size) => size === requestedSize) ?? TABLE_PAGE_SIZE;

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    setPage(next) {
      set({ [pageName]: next > 1 ? String(next) : null });
    },
    setPageSize(next) {
      set({ [pageName]: null, [sizeName]: next === TABLE_PAGE_SIZE ? null : String(next) });
    },
  };
}
