"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** `page` and `page_size`, or a table's prefixed pair (`employments_page`). */
const PAGING_PARAM = /(^|_)page(_size)?$/;
const PAGE_PARAM = /(^|_)page$/;

/**
 * Search params as page state. `set` replaces params in place (`null` removes one); any
 * change other than paging sends every table back to its first page (keeping its page
 * size), because a new filter, search or sort makes the old page number meaningless.
 */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function set(changes: Record<string, string | null | undefined>) {
    const params = new URLSearchParams(searchParams);
    if (Object.keys(changes).some((name) => !PAGING_PARAM.test(name))) {
      for (const name of [...params.keys()]) {
        if (PAGE_PARAM.test(name) && !(name in changes)) params.delete(name);
      }
    }
    for (const [name, value] of Object.entries(changes)) {
      if (value) params.set(name, value);
      else params.delete(name);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return { searchParams, set };
}
