/** Page size for infinite lists and pickers (Django `limit`/`offset`). */
export const PAGE_SIZE = 50;

/** A paged table's rows per page until the viewer picks another size. */
export const TABLE_PAGE_SIZE = 10;

/** Offset pagination: the next offset while fewer rows than `count` have been loaded. */
export function nextOffset(
  page: { count: number; results: readonly unknown[] },
  pages: readonly { results: readonly unknown[] }[],
): number | undefined {
  const loaded = pages.reduce((total, current) => total + current.results.length, 0);
  return page.results.length > 0 && loaded < page.count ? loaded : undefined;
}

/** Rows-per-page choices; the API caps `limit` at 100. */
export const PAGE_SIZES = [10, 20, 50, 100] as const;

/** One page of an offset-paginated list. */
export interface Page {
  offset: number;
  limit: number;
}

/** The first page, for pickers and lookups that never page. */
export const FIRST_PAGE: Page = { offset: 0, limit: PAGE_SIZE };
