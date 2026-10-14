import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import { offerKeys, organizationHeader } from "./queries";

// --- Categories (Aayulogic administration) ---------------------------------------------

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: offerKeys.categories() });
}

export function useCreateCategory() {
  return useMutation({
    mutationFn: (body: Schemas["CategoryInput"]) =>
      unwrap(api.POST("/admin/offer-categories", { body })),
    onSuccess: useInvalidateCategories(),
  });
}

/** Refetch on failure too: a 409 means the loaded version is stale. */
export function useUpdateCategory(categoryId: string) {
  return useMutation({
    mutationFn: (body: Schemas["CategoryUpdate"]) =>
      unwrap(
        api.PUT("/admin/offer-categories/{category_id}", {
          params: { path: { category_id: pathId(categoryId) } },
          body,
        }),
      ),
    onSettled: useInvalidateCategories(),
  });
}

export function useRetireCategory(categoryId: string) {
  return useMutation({
    mutationFn: (body: Schemas["ExpectedVersionReason"]) =>
      unwrap(
        api.POST("/admin/offer-categories/{category_id}/retire", {
          params: { path: { category_id: pathId(categoryId) } },
          body,
        }),
      ),
    onSettled: useInvalidateCategories(),
  });
}

export function useReactivateCategory(categoryId: string) {
  return useMutation({
    mutationFn: (body: Schemas["ExpectedVersionReason"]) =>
      unwrap(
        api.POST("/admin/offer-categories/{category_id}/reactivate", {
          params: { path: { category_id: pathId(categoryId) } },
          body,
        }),
      ),
    onSettled: useInvalidateCategories(),
  });
}

// --- Offers (Aayulogic administration) -------------------------------------------------

/** Posts an offer for a verified partner: save as draft, submit, or publish directly. */
export function useCreateOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["AdminOfferCreate"]) => unwrap(api.POST("/admin/offers", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: offerKeys.lists() }),
  });
}

function useInvalidateOffer(offerId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: offerKeys.detail(offerId) }),
      queryClient.invalidateQueries({ queryKey: offerKeys.decisions(offerId) }),
      queryClient.invalidateQueries({ queryKey: offerKeys.versions(offerId) }),
      queryClient.invalidateQueries({ queryKey: offerKeys.lists() }),
    ]);
}

export function useUpdateOffer(offerId: string) {
  return useMutation({
    mutationFn: (body: Schemas["AdminOfferUpdate"]) =>
      unwrap(
        api.PUT("/admin/offers/{offer_id}", {
          params: { path: { offer_id: pathId(offerId) } },
          body,
        }),
      ),
    onSettled: useInvalidateOffer(offerId),
  });
}

/** Decisions on the working version the reviewer read; the API answers 409 if it changed. */
type VersionAction = "approve" | "publish" | "reject" | "request-changes";
/** Offer-level actions on the loaded version, with a required reason except submit. */
type OfferLevelAction = "submit" | "retract" | "unpublish" | "suspend" | "reinstate";
export type OfferAction = VersionAction | OfferLevelAction;

export interface OfferActionBody {
  expected_version: number;
  reason: string;
  /** Required by the version actions: the working version shown to the reviewer. */
  version_id?: string;
}

function versionBody({ version_id, ...body }: OfferActionBody) {
  if (!version_id) throw new Error("A version decision needs the reviewed version_id");
  return { ...body, version_id };
}

// Literal paths keep every call visible to the contract-coverage test.
function postOfferAction(action: OfferAction, offerId: string, body: OfferActionBody) {
  const params = { path: { offer_id: pathId(offerId) } };
  const { expected_version, reason } = body;
  switch (action) {
    case "approve":
      return api.POST("/admin/offers/{offer_id}/approve", { params, body: versionBody(body) });
    case "publish":
      return api.POST("/admin/offers/{offer_id}/publish", { params, body: versionBody(body) });
    case "reject":
      return api.POST("/admin/offers/{offer_id}/reject", { params, body: versionBody(body) });
    case "request-changes":
      return api.POST("/admin/offers/{offer_id}/request-changes", {
        params,
        body: versionBody(body),
      });
    case "submit":
      return api.POST("/admin/offers/{offer_id}/submit", {
        params,
        body: { expected_version, reason },
      });
    case "retract":
      return api.POST("/admin/offers/{offer_id}/retract", {
        params,
        body: { expected_version, reason },
      });
    case "unpublish":
      return api.POST("/admin/offers/{offer_id}/unpublish", {
        params,
        body: { expected_version, reason },
      });
    case "suspend":
      return api.POST("/admin/offers/{offer_id}/suspend", {
        params,
        body: { expected_version, reason },
      });
    case "reinstate":
      return api.POST("/admin/offers/{offer_id}/reinstate", {
        params,
        body: { expected_version, reason },
      });
  }
}

/** Every administrator state change on one offer. */
export function useOfferAction(offerId: string) {
  return useMutation({
    mutationFn: ({ action, ...body }: OfferActionBody & { action: OfferAction }) =>
      unwrap(postOfferAction(action, offerId, body)),
    onSettled: useInvalidateOffer(offerId),
  });
}

export function useFeatureOffer(offerId: string) {
  return useMutation({
    mutationFn: (body: Schemas["FeatureInput"]) =>
      unwrap(
        api.POST("/admin/offers/{offer_id}/feature", {
          params: { path: { offer_id: pathId(offerId) } },
          body,
        }),
      ),
    onSettled: useInvalidateOffer(offerId),
  });
}

// --- Partner portal (the selected organization) ----------------------------------------

export function useCreateOwnOffer(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["OfferInput"]) =>
      unwrap(
        api.POST("/partner/offers", {
          params: { header: organizationHeader(organizationId) },
          body,
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: offerKeys.own(organizationId) }),
  });
}

function useInvalidateOwnOffers(organizationId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: offerKeys.own(organizationId) });
}

export function useUpdateOwnOffer(organizationId: string, offerId: string) {
  return useMutation({
    mutationFn: (body: Schemas["OfferUpdate"]) =>
      unwrap(
        api.PUT("/partner/offers/{offer_id}", {
          params: {
            header: organizationHeader(organizationId),
            path: { offer_id: pathId(offerId) },
          },
          body,
        }),
      ),
    onSettled: useInvalidateOwnOffers(organizationId),
  });
}

export type OwnOfferAction = "submit" | "retract" | "unpublish" | "pause" | "resume" | "retire";

function postOwnOfferAction(
  action: OwnOfferAction,
  organizationId: string,
  offerId: string,
  body: Schemas["ExpectedVersion"],
) {
  const params = {
    header: organizationHeader(organizationId),
    path: { offer_id: pathId(offerId) },
  };
  switch (action) {
    case "submit":
      return api.POST("/partner/offers/{offer_id}/submit", { params, body });
    case "retract":
      return api.POST("/partner/offers/{offer_id}/retract", { params, body });
    case "unpublish":
      return api.POST("/partner/offers/{offer_id}/unpublish", { params, body });
    case "pause":
      return api.POST("/partner/offers/{offer_id}/pause", { params, body });
    case "resume":
      return api.POST("/partner/offers/{offer_id}/resume", { params, body });
    case "retire":
      return api.POST("/partner/offers/{offer_id}/retire", { params, body });
  }
}

/** Every owner state change on one of the selected organization's offers. */
export function useOwnOfferAction(organizationId: string, offerId: string) {
  return useMutation({
    mutationFn: ({ action, ...body }: Schemas["ExpectedVersion"] & { action: OwnOfferAction }) =>
      unwrap(postOwnOfferAction(action, organizationId, offerId, body)),
    onSettled: useInvalidateOwnOffers(organizationId),
  });
}
