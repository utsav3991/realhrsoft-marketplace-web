import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  OfferAction,
  OfferActionBody,
  OwnOfferAction,
} from "@/features/offers/api/mutations";
import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import { businessKeys } from "./queries";

function organizationHeader(organizationId: string) {
  return { "X-Organization-ID": organizationId };
}

// --- Aayulogic administration ---------------------------------------------------------

/** Posts for a verified partner or an employer: save as draft, submit, or publish directly. */
export function useCreateAdminBusinessOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["AdminBusinessOfferCreate"]) =>
      unwrap(api.POST("/admin/business-offers", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessKeys.adminLists() }),
  });
}

/** Refetch on failure too: a 409 means the loaded version is stale. */
function useInvalidateAdmin() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: businessKeys.admin() });
}

export function useUpdateAdminBusinessOffer(offerId: string) {
  return useMutation({
    mutationFn: (body: Schemas["AdminBusinessOfferUpdate"]) =>
      unwrap(
        api.PUT("/admin/business-offers/{offer_id}", {
          params: { path: { offer_id: pathId(offerId) } },
          body,
        }),
      ),
    onSettled: useInvalidateAdmin(),
  });
}

/** Business offers are never featured: that is a marketplace placement. */
export type BusinessOfferAction = OfferAction;

function versionBody({ version_id, ...body }: OfferActionBody) {
  if (!version_id) throw new Error("A version decision needs the reviewed version_id");
  return { ...body, version_id };
}

// Literal paths keep every call visible to the contract-coverage test.
function postAdminAction(action: BusinessOfferAction, offerId: string, body: OfferActionBody) {
  const params = { path: { offer_id: pathId(offerId) } };
  const { expected_version, reason } = body;
  switch (action) {
    case "approve":
      return api.POST("/admin/business-offers/{offer_id}/approve", {
        params,
        body: versionBody(body),
      });
    case "publish":
      return api.POST("/admin/business-offers/{offer_id}/publish", {
        params,
        body: versionBody(body),
      });
    case "reject":
      return api.POST("/admin/business-offers/{offer_id}/reject", {
        params,
        body: versionBody(body),
      });
    case "request-changes":
      return api.POST("/admin/business-offers/{offer_id}/request-changes", {
        params,
        body: versionBody(body),
      });
    case "submit":
      return api.POST("/admin/business-offers/{offer_id}/submit", {
        params,
        body: { expected_version, reason },
      });
    case "retract":
      return api.POST("/admin/business-offers/{offer_id}/retract", {
        params,
        body: { expected_version, reason },
      });
    case "unpublish":
      return api.POST("/admin/business-offers/{offer_id}/unpublish", {
        params,
        body: { expected_version, reason },
      });
    case "suspend":
      return api.POST("/admin/business-offers/{offer_id}/suspend", {
        params,
        body: { expected_version, reason },
      });
    case "reinstate":
      return api.POST("/admin/business-offers/{offer_id}/reinstate", {
        params,
        body: { expected_version, reason },
      });
  }
}

/** Every administrator state change on one business offer. */
export function useAdminBusinessOfferAction(offerId: string) {
  return useMutation({
    mutationFn: ({ action, ...body }: OfferActionBody & { action: BusinessOfferAction }) =>
      unwrap(postAdminAction(action, offerId, body)),
    onSettled: useInvalidateAdmin(),
  });
}

// --- Business portal: own offers ------------------------------------------------------

function useInvalidateOwn(organizationId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: businessKeys.own(organizationId) });
}

export function useCreateOwnBusinessOffer(organizationId: string) {
  return useMutation({
    mutationFn: (body: Schemas["BusinessOfferInput"]) =>
      unwrap(
        api.POST("/business/own-offers", {
          params: { header: organizationHeader(organizationId) },
          body,
        }),
      ),
    onSuccess: useInvalidateOwn(organizationId),
  });
}

export function useUpdateOwnBusinessOffer(organizationId: string, offerId: string) {
  return useMutation({
    mutationFn: (body: Schemas["BusinessOfferUpdate"]) =>
      unwrap(
        api.PUT("/business/own-offers/{offer_id}", {
          params: {
            header: organizationHeader(organizationId),
            path: { offer_id: pathId(offerId) },
          },
          body,
        }),
      ),
    onSettled: useInvalidateOwn(organizationId),
  });
}

function postOwnAction(
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
      return api.POST("/business/own-offers/{offer_id}/submit", { params, body });
    case "retract":
      return api.POST("/business/own-offers/{offer_id}/retract", { params, body });
    case "unpublish":
      return api.POST("/business/own-offers/{offer_id}/unpublish", { params, body });
    case "pause":
      return api.POST("/business/own-offers/{offer_id}/pause", { params, body });
    case "resume":
      return api.POST("/business/own-offers/{offer_id}/resume", { params, body });
    case "retire":
      return api.POST("/business/own-offers/{offer_id}/retire", { params, body });
  }
}

/** Every owner state change on one of the selected organization's business offers. */
export function useOwnBusinessOfferAction(organizationId: string, offerId: string) {
  return useMutation({
    mutationFn: ({ action, ...body }: Schemas["ExpectedVersion"] & { action: OwnOfferAction }) =>
      unwrap(postOwnAction(action, organizationId, offerId, body)),
    onSettled: useInvalidateOwn(organizationId),
  });
}

// --- Business portal: enquiries ---------------------------------------------------------

/**
 * Enquires about another organization's offer on the selected organization's behalf, naming
 * the live version read. The catalogue refetches either way: it shows the open enquiry, and a
 * 409 means the offer changed or an enquiry is already open.
 */
export function useEnquire(organizationId: string, offerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["EnquiryInput"]) =>
      unwrap(
        api.POST("/business/offers/{offer_id}/enquire", {
          params: {
            header: organizationHeader(organizationId),
            path: { offer_id: pathId(offerId) },
          },
          body,
        }),
      ),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: businessKeys.catalogue(organizationId) }),
        queryClient.invalidateQueries({ queryKey: businessKeys.sent(organizationId) }),
      ]),
  });
}

/** Closes a lead once followed up; the enquirer is notified and sees the note. */
export function useCloseEnquiry(organizationId: string, enquiryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["CloseEnquiryInput"]) =>
      unwrap(
        api.POST("/business/received-enquiries/{enquiry_id}/close", {
          params: {
            header: organizationHeader(organizationId),
            path: { enquiry_id: pathId(enquiryId) },
          },
          body,
        }),
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: businessKeys.received(organizationId) }),
  });
}
