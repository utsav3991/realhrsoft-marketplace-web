import { useMutation, useQueryClient } from "@tanstack/react-query";

import { organizationHeader } from "@/features/offers/api/queries";
import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import { benefitKeys } from "./queries";

// --- Employer portal (the selected organization) -----------------------------------------

function useInvalidateOwnBenefits(organizationId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: benefitKeys.own(organizationId) });
}

/**
 * Creates a benefit owned by the selected organization, saved as a draft or published at once
 * (intent). Its employees are the only audience.
 */
export function useCreateOwnBenefit(organizationId: string) {
  return useMutation({
    mutationFn: (body: Schemas["BenefitContent"]) =>
      unwrap(
        api.POST("/employer/benefits", {
          params: { header: organizationHeader(organizationId) },
          body,
        }),
      ),
    onSuccess: useInvalidateOwnBenefits(organizationId),
  });
}

/**
 * Saves the terms: an unpublished benefit's draft, or a live benefit's new version, which is
 * published at once. Refetch on failure too: a 409 means the loaded version is stale.
 */
export function useUpdateOwnBenefit(organizationId: string, benefitId: string) {
  return useMutation({
    mutationFn: (body: Schemas["BenefitUpdate"]) =>
      unwrap(
        api.PUT("/employer/benefits/{offer_id}", {
          params: {
            header: organizationHeader(organizationId),
            path: { offer_id: pathId(benefitId) },
          },
          body,
        }),
      ),
    onSettled: useInvalidateOwnBenefits(organizationId),
  });
}

export type OwnBenefitAction = "publish" | "unpublish" | "pause" | "resume" | "retire";

// Literal paths keep every call visible to the contract-coverage test.
function postOwnBenefitAction(
  action: OwnBenefitAction,
  organizationId: string,
  benefitId: string,
  body: Schemas["ExpectedVersion"],
) {
  const params = {
    header: organizationHeader(organizationId),
    path: { offer_id: pathId(benefitId) },
  };
  switch (action) {
    case "publish":
      return api.POST("/employer/benefits/{offer_id}/publish", { params, body });
    case "unpublish":
      return api.POST("/employer/benefits/{offer_id}/unpublish", { params, body });
    case "pause":
      return api.POST("/employer/benefits/{offer_id}/pause", { params, body });
    case "resume":
      return api.POST("/employer/benefits/{offer_id}/resume", { params, body });
    case "retire":
      return api.POST("/employer/benefits/{offer_id}/retire", { params, body });
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
  const params = { path: { offer_id: pathId(benefitId) } };
  switch (action) {
    case "suspend":
      return api.POST("/admin/company-benefits/{offer_id}/suspend", { params, body });
    case "reinstate":
      return api.POST("/admin/company-benefits/{offer_id}/reinstate", { params, body });
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
 * Uses a benefit once: the claim is accepted at once and records one use. It names the version
 * the employee read (OFFER_VERSION_CHANGED if another went live). The caller supplies the
 * Idempotency-Key and keeps it for retries of the same attempt, so a lost response replays
 * the same use instead of using the benefit twice. Refetch on failure too: a 409 means the
 * counts or terms changed.
 */
export function useClaimBenefit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      benefitId,
      versionId,
      idempotencyKey,
    }: {
      benefitId: string;
      versionId: string;
      idempotencyKey: string;
    }) =>
      unwrap(
        api.POST("/marketplace/benefit-claims", {
          params: { header: { "Idempotency-Key": idempotencyKey } },
          body: { offer_id: benefitId, version_id: versionId },
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: benefitKeys.mine() }),
  });
}
