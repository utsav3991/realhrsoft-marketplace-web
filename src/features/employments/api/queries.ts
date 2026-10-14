import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SortOrdering } from "@/design-system/components/data-table";
import { api, pathId, unwrap, type Page, type Schemas } from "@/shared/api";

export type Employment = Schemas["Employment"];

/** Employment columns the API sorts by (`ordering`). */
export const EMPLOYMENT_SORTS = [
  "employee_name",
  "organization_name",
  "started_at",
  "ended_at",
] as const;
export type EmploymentOrdering = SortOrdering<(typeof EMPLOYMENT_SORTS)[number]>;

export interface EmploymentFilters {
  search: string;
  isCurrent: boolean | null;
  employeeId: string | null;
  organizationId: string | null;
  ordering: EmploymentOrdering | null;
}

export const employmentKeys = {
  all: ["employments"] as const,
  lists: () => [...employmentKeys.all, "list"] as const,
  list: (filters: EmploymentFilters, page: Page) =>
    [...employmentKeys.lists(), filters, page] as const,
  detail: (id: string) => [...employmentKeys.all, "detail", id] as const,
};

/**
 * Employment episodes synchronized from RealHRSoft, newest start first unless sorted; search
 * matches the employee's name or email. Read-only: RealHRSoft owns employment.
 */
export function useEmployments(filters: EmploymentFilters, page: Page, { enabled = true } = {}) {
  return useQuery({
    queryKey: employmentKeys.list(filters, page),
    enabled,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/employments", {
          params: {
            query: {
              search: filters.search || undefined,
              is_current: filters.isCurrent ?? undefined,
              employee_id: filters.employeeId ?? undefined,
              organization_id: filters.organizationId ?? undefined,
              ordering: filters.ordering ? [filters.ordering] : undefined,
              offset: page.offset,
              limit: page.limit,
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useEmployment(employmentId: string) {
  return useQuery({
    queryKey: employmentKeys.detail(employmentId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/employments/{employment_id}", {
          params: { path: { employment_id: pathId(employmentId) } },
          signal,
        }),
      ),
  });
}
