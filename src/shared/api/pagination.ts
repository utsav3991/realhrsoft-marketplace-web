/** Page size for offset-paginated lists (Django `limit`/`offset`). */
export const PAGE_SIZE = 50;

/** Offset pagination: the next offset while fewer rows than `count` have been loaded. */
export function nextOffset(
  page: { count: number; results: readonly unknown[] },
  pages: readonly { results: readonly unknown[] }[],
): number | undefined {
  const loaded = pages.reduce((total, current) => total + current.results.length, 0);
  return page.results.length > 0 && loaded < page.count ? loaded : undefined;
}
