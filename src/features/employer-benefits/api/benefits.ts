import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, pathId, unwrap, type Schemas } from "@/shared/api";

export type BenefitStatus = "draft" | "active" | "retired";

export interface BenefitFilters {
  status?: BenefitStatus;
  q?: string;
}

// Keyed by organization: every read is scoped by X-Organization-ID.
export const benefitKeys = {
  all: (organizationId: string) => ["benefits", organizationId] as const,
  lists: (organizationId: string) => [...benefitKeys.all(organizationId), "list"] as const,
  list: (organizationId: string, filters: BenefitFilters) =>
    [...benefitKeys.lists(organizationId), filters] as const,
  detail: (organizationId: string, benefitId: string) =>
    [...benefitKeys.all(organizationId), "detail", benefitId] as const,
};

const PAGE_SIZE = 50;

export function useBenefits(organizationId: string, filters: BenefitFilters) {
  return useInfiniteQuery({
    queryKey: benefitKeys.list(organizationId, filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/employer/benefits", {
          params: {
            query: {
              status: filters.status,
              q: filters.q || undefined,
              cursor: pageParam ?? undefined,
              limit: PAGE_SIZE,
            },
          },
          signal,
        }),
      ),
    getNextPageParam: (page) => page.next_cursor,
  });
}

export function useBenefit(organizationId: string, benefitId: string) {
  return useQuery({
    queryKey: benefitKeys.detail(organizationId, benefitId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/employer/benefits/{benefit_id}", {
          params: { path: { benefit_id: pathId(benefitId) } },
          signal,
        }),
      ),
  });
}

export function useCreateBenefit(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["BenefitBody"]) => unwrap(api.POST("/employer/benefits", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: benefitKeys.lists(organizationId) }),
  });
}

/** Edits and transitions refetch on failure too: a 409 means the loaded version is stale. */
function useBenefitMutation<V>(
  organizationId: string,
  benefitId: string,
  send: (path: { benefit_id: string }, variables: V) => Promise<Schemas["VersionResponse"]>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: V) => send({ benefit_id: pathId(benefitId) }, variables),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: benefitKeys.detail(organizationId, benefitId) }),
        queryClient.invalidateQueries({ queryKey: benefitKeys.lists(organizationId) }),
      ]),
  });
}

export function useUpdateBenefit(organizationId: string, benefitId: string) {
  return useBenefitMutation(
    organizationId,
    benefitId,
    (path, body: Schemas["UpdateBenefitRequest"]) =>
      unwrap(api.PATCH("/employer/benefits/{benefit_id}", { params: { path }, body })),
  );
}

export function usePublishBenefit(organizationId: string, benefitId: string) {
  return useBenefitMutation(organizationId, benefitId, (path, body: Schemas["VersionRequest"]) =>
    unwrap(api.POST("/employer/benefits/{benefit_id}/publish", { params: { path }, body })),
  );
}

export function useRetireBenefit(organizationId: string, benefitId: string) {
  return useBenefitMutation(organizationId, benefitId, (path, body: Schemas["VersionRequest"]) =>
    unwrap(api.POST("/employer/benefits/{benefit_id}/retire", { params: { path }, body })),
  );
}
