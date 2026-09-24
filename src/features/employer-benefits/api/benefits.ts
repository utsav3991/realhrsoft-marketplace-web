import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, pathId, unwrap, type Schemas } from "@/shared/api";

export type BenefitStatus = "draft" | "active" | "paused" | "retired";
export type BenefitType = Schemas["BenefitBody"]["benefit_type"];

export interface BenefitFilters {
  status?: BenefitStatus;
  type?: BenefitType;
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
              type: filters.type,
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

/**
 * Edits, transitions and option changes refetch on failure too: a 409 means the loaded version
 * is stale. Options belong to the benefit, so every option change bumps the benefit's version.
 */
function useBenefitMutation<V, R>(
  organizationId: string,
  benefitId: string,
  send: (path: { benefit_id: string }, variables: V) => Promise<R>,
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

export function usePauseBenefit(organizationId: string, benefitId: string) {
  return useBenefitMutation(organizationId, benefitId, (path, body: Schemas["VersionRequest"]) =>
    unwrap(api.POST("/employer/benefits/{benefit_id}/pause", { params: { path }, body })),
  );
}

export function useResumeBenefit(organizationId: string, benefitId: string) {
  return useBenefitMutation(organizationId, benefitId, (path, body: Schemas["VersionRequest"]) =>
    unwrap(api.POST("/employer/benefits/{benefit_id}/resume", { params: { path }, body })),
  );
}

export function useAddBenefitOption(organizationId: string, benefitId: string) {
  return useBenefitMutation(organizationId, benefitId, (path, body: Schemas["AddOptionRequest"]) =>
    unwrap(api.POST("/employer/benefits/{benefit_id}/options", { params: { path }, body })),
  );
}

export function useUpdateBenefitOption(organizationId: string, benefitId: string) {
  return useBenefitMutation(
    organizationId,
    benefitId,
    (path, { optionId, body }: { optionId: string; body: Schemas["UpdateOptionRequest"] }) =>
      unwrap(
        api.PATCH("/employer/benefits/{benefit_id}/options/{option_id}", {
          params: { path: { ...path, option_id: pathId(optionId) } },
          body,
        }),
      ),
  );
}

/** DELETE carries the loaded version as a query parameter. */
export function useRemoveBenefitOption(organizationId: string, benefitId: string) {
  return useBenefitMutation(
    organizationId,
    benefitId,
    (path, { optionId, version }: { optionId: string; version: number }) =>
      unwrap(
        api.DELETE("/employer/benefits/{benefit_id}/options/{option_id}", {
          params: { path: { ...path, option_id: pathId(optionId) }, query: { version } },
        }),
      ),
  );
}
