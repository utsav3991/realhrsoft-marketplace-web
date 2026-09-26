import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import { employmentKeys } from "./queries";

export function useStartEmployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["StartEmployment"]) =>
      unwrap(api.POST("/admin/employments", { body })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: employmentKeys.all }),
  });
}

/** Refetch on failure too: a 409 means the loaded version is stale or it already ended. */
export function useEndEmployment(employmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["ExpectedVersionReason"]) =>
      unwrap(
        api.POST("/admin/employments/{employment_id}/end", {
          params: { path: { employment_id: pathId(employmentId) } },
          body,
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: employmentKeys.all }),
  });
}
