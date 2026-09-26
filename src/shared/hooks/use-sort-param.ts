"use client";

import type { DataTableSort, SortOrdering } from "@/design-system/components/data-table";

import { useUrlParams } from "./use-url-params";

/**
 * A table's ordering as a URL param (`?ordering=-claimed_at`), so a sorted view can be shared
 * and reloaded. Values outside `keys` read as the default order and are never sent to the API.
 * Changing it returns the table to its first page.
 */
export function useSortParam<K extends string>(
  keys: readonly K[],
  name = "ordering",
): DataTableSort<K> {
  const { searchParams, set } = useUrlParams();
  const raw = searchParams.get(name);
  const value =
    raw && (keys as readonly string[]).includes(raw.replace(/^-/, ""))
      ? (raw as SortOrdering<K>)
      : null;

  return {
    value,
    onChange(next) {
      set({ [name]: next });
    },
  };
}
