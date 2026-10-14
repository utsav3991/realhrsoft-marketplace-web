import { useMutation, useQueryClient } from "@tanstack/react-query";

import { clientHeader, organizationHeader } from "@/features/offers/api/queries";
import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import { benefitBody, clientBenefitBody, type BenefitValues } from "../schemas/benefit";
import { benefitKeys, type BenefitOwner } from "./queries";

// --- Owner portals (the selected company or client) ---------------------------------------

function useInvalidateOwnBenefits(owner: BenefitOwner) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: benefitKeys.own(owner) });
}

type Intent = NonNullable<Schemas["BenefitContent"]["intent"]>;

/**
 * Creates a benefit, saved as a draft or published at once (intent). A company's goes to its
 * own employees; a client's to the audience companies chosen in the form.
 */
export function useCreateOwnBenefit(owner: BenefitOwner) {
  return useMutation({
    mutationFn: ({ values, intent }: { values: BenefitValues; intent: Intent }) =>
      unwrap(
        owner.kind === "client"
          ? api.POST("/client/benefits", {
              params: { header: clientHeader(owner.id) },
              body: { ...clientBenefitBody(values), intent },
            })
          : api.POST("/employer/benefits", {
              params: { header: organizationHeader(owner.id) },
              body: { ...benefitBody(values), intent },
            }),
      ),
    onSuccess: useInvalidateOwnBenefits(owner),
  });
}

/**
 * Saves the terms: an unpublished benefit's draft, or a live benefit's new version, which is
 * published at once. Refetch on failure too: a 409 means the loaded version is stale.
 */
export function useUpdateOwnBenefit(owner: BenefitOwner, benefitId: string) {
  return useMutation({
    mutationFn: ({
      values,
      intent,
      expectedVersion,
    }: {
      values: BenefitValues;
      intent: Intent;
      expectedVersion: number;
    }) => {
      const path = { offer_id: pathId(benefitId) };
      return unwrap(
        owner.kind === "client"
          ? api.PUT("/client/benefits/{offer_id}", {
              params: { header: clientHeader(owner.id), path },
              body: { ...clientBenefitBody(values), intent, expected_version: expectedVersion },
            })
          : api.PUT("/employer/benefits/{offer_id}", {
              params: { header: organizationHeader(owner.id), path },
              body: { ...benefitBody(values), intent, expected_version: expectedVersion },
            }),
      );
    },
    onSettled: useInvalidateOwnBenefits(owner),
  });
}

export type OwnBenefitAction = "publish" | "unpublish" | "pause" | "resume" | "retire";

function postClientBenefitAction(
  action: OwnBenefitAction,
  clientId: string,
  benefitId: string,
  body: Schemas["ExpectedVersion"],
) {
  const params = { header: clientHeader(clientId), path: { offer_id: pathId(benefitId) } };
  switch (action) {
    case "publish":
      return api.POST("/client/benefits/{offer_id}/publish", { params, body });
    case "unpublish":
      return api.POST("/client/benefits/{offer_id}/unpublish", { params, body });
    case "pause":
      return api.POST("/client/benefits/{offer_id}/pause", { params, body });
    case "resume":
      return api.POST("/client/benefits/{offer_id}/resume", { params, body });
    case "retire":
      return api.POST("/client/benefits/{offer_id}/retire", { params, body });
  }
}

function postOrganizationBenefitAction(
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

export function useOwnBenefitAction(owner: BenefitOwner, benefitId: string) {
  return useMutation({
    mutationFn: ({ action, ...body }: Schemas["ExpectedVersion"] & { action: OwnBenefitAction }) =>
      unwrap(
        owner.kind === "client"
          ? postClientBenefitAction(action, owner.id, benefitId, body)
          : postOrganizationBenefitAction(action, owner.id, benefitId, body),
      ),
    onSettled: useInvalidateOwnBenefits(owner),
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
