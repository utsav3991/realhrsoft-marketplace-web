import { useMutation, useQueryClient } from "@tanstack/react-query";

import { organizationHeader } from "@/features/offers/api/queries";
import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import { benefitKeys } from "./queries";

// --- Employer portal (the selected organization) -----------------------------------------

function useInvalidateOwnBenefits(organizationId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: benefitKeys.own(organizationId) });
}

/** Creates a draft owned by the selected organization; its employees are the only audience. */
export function useCreateOwnBenefit(organizationId: string) {
  return useMutation({
    mutationFn: (body: Schemas["BenefitInput"]) =>
      unwrap(
        api.POST("/employer/benefits", {
          params: { header: organizationHeader(organizationId) },
          body,
        }),
      ),
    onSuccess: useInvalidateOwnBenefits(organizationId),
  });
}

/** Refetch on failure too: a 409 means the loaded version is stale. */
export function useUpdateOwnBenefit(organizationId: string, benefitId: string) {
  return useMutation({
    mutationFn: (body: Schemas["BenefitUpdate"]) =>
      unwrap(
        api.PUT("/employer/benefits/{benefit_id}", {
          params: {
            header: organizationHeader(organizationId),
            path: { benefit_id: pathId(benefitId) },
          },
          body,
        }),
      ),
    onSettled: useInvalidateOwnBenefits(organizationId),
  });
}

export type OwnBenefitAction = "publish" | "retire";

// Literal paths keep every call visible to the contract-coverage test.
function postOwnBenefitAction(
  action: OwnBenefitAction,
  organizationId: string,
  benefitId: string,
  body: Schemas["ExpectedVersion"],
) {
  const params = {
    header: organizationHeader(organizationId),
    path: { benefit_id: pathId(benefitId) },
  };
  switch (action) {
    case "publish":
      return api.POST("/employer/benefits/{benefit_id}/publish", { params, body });
    case "retire":
      return api.POST("/employer/benefits/{benefit_id}/retire", { params, body });
  }
}

export function useOwnBenefitAction(organizationId: string, benefitId: string) {
  return useMutation({
    mutationFn: ({ action, ...body }: Schemas["ExpectedVersion"] & { action: OwnBenefitAction }) =>
      unwrap(postOwnBenefitAction(action, organizationId, benefitId, body)),
    onSettled: useInvalidateOwnBenefits(organizationId),
  });
}

// --- Aayulogic moderation ----------------------------------------------------------------

export type AdminBenefitAction = "suspend" | "reinstate";

function postAdminBenefitAction(
  action: AdminBenefitAction,
  benefitId: string,
  body: Schemas["ExpectedVersionReason"],
) {
  const params = { path: { benefit_id: pathId(benefitId) } };
  switch (action) {
    case "suspend":
      return api.POST("/admin/company-benefits/{benefit_id}/suspend", { params, body });
    case "reinstate":
      return api.POST("/admin/company-benefits/{benefit_id}/reinstate", { params, body });
  }
}

export function useAdminBenefitAction(benefitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      action,
      ...body
    }: Schemas["ExpectedVersionReason"] & { action: AdminBenefitAction }) =>
      unwrap(postAdminBenefitAction(action, benefitId, body)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: benefitKeys.admin() }),
  });
}

// --- Employee ----------------------------------------------------------------------------

/**
 * Claims (uses) a benefit once. The caller supplies the Idempotency-Key and keeps it for
 * retries of the same attempt, so a lost response replays the same claim (200) instead of
 * using the benefit twice. Refetch on failure too: a 409 means the counts changed.
 */
export function useClaimBenefit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ benefitId, idempotencyKey }: { benefitId: string; idempotencyKey: string }) =>
      unwrap(
        api.POST("/marketplace/company-benefits/{benefit_id}/claim", {
          params: {
            header: { "Idempotency-Key": idempotencyKey },
            path: { benefit_id: pathId(benefitId) },
          },
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: benefitKeys.mine() }),
  });
}
