import { useEffect } from "react";

import type { CategoryRef } from "../api/queries";
import { useActiveCategories, useOwnCategories } from "../api/queries";
import type { CategoryOption } from "./offer-form";

/**
 * Active categories plus the edited version's one when it has been retired, so an edit form
 * can show it (saving still needs an active category; the API says so).
 */
function withCurrent(
  active: readonly { id: string; name: string }[],
  current: CategoryRef | undefined,
): CategoryOption[] {
  const options = active.map(({ id, name }) => ({ id, name, isActive: true }));
  if (current && !options.some((option) => option.id === current.id)) {
    options.push({ id: current.id, name: current.name, isActive: current.is_active });
  }
  return options;
}

/** Administrators: every active category, loading every page. */
export function useAdminCategoryOptions(current?: CategoryRef) {
  const categories = useActiveCategories();
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = categories;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const active = categories.data?.pages.flatMap((page) => page.results) ?? [];
  return { query: categories, options: withCurrent(active, current) };
}

/** Partner portal: the active categories of the selected organization's catalogue. */
export function useOwnCategoryOptions(organizationId: string, current?: CategoryRef) {
  const categories = useOwnCategories(organizationId);
  return { query: categories, options: withCurrent(categories.data ?? [], current) };
}
