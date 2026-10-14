import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { OfferAction, OfferActionBody, OwnOfferAction } from "@/features/offers/api/mutations";
import { clientHeader, organizationHeader } from "@/features/offers/api/queries";
import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import { businessKeys, type BusinessOwner } from "./queries";

// --- Aayulogic administration ---------------------------------------------------------

/** Posts for a verified merchant or a client group: save as draft, submit, or publish. */
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

// --- The acting business: own offers -------------------------------------------------
// Literal paths keep every call visible to the contract-coverage test.

function useInvalidateOwn(owner: BusinessOwner) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: businessKeys.own(owner) });
}

export function useCreateOwnBusinessOffer(owner: BusinessOwner) {
  return useMutation({
    mutationFn: (body: Schemas["BusinessOfferInput"]) =>
      unwrap(
        owner.kind === "client"
          ? api.POST("/client/business/own-offers", {
              params: { header: clientHeader(owner.id) },
              body,
            })
          : api.POST("/business/own-offers", {
              params: { header: organizationHeader(owner.id) },
              body,
            }),
      ),
    onSuccess: useInvalidateOwn(owner),
  });
}

export function useUpdateOwnBusinessOffer(owner: BusinessOwner, offerId: string) {
  return useMutation({
    mutationFn: (body: Schemas["BusinessOfferUpdate"]) => {
      const path = { offer_id: pathId(offerId) };
      return unwrap(
        owner.kind === "client"
          ? api.PUT("/client/business/own-offers/{offer_id}", {
              params: { header: clientHeader(owner.id), path },
              body,
            })
          : api.PUT("/business/own-offers/{offer_id}", {
              params: { header: organizationHeader(owner.id), path },
              body,
            }),
      );
    },
    onSettled: useInvalidateOwn(owner),
  });
}

function postClientAction(
  action: OwnOfferAction,
  clientId: string,
  offerId: string,
  body: Schemas["ExpectedVersion"],
) {
  const params = { header: clientHeader(clientId), path: { offer_id: pathId(offerId) } };
  switch (action) {
    case "submit":
      return api.POST("/client/business/own-offers/{offer_id}/submit", { params, body });
    case "retract":
      return api.POST("/client/business/own-offers/{offer_id}/retract", { params, body });
    case "unpublish":
      return api.POST("/client/business/own-offers/{offer_id}/unpublish", { params, body });
    case "pause":
      return api.POST("/client/business/own-offers/{offer_id}/pause", { params, body });
    case "resume":
      return api.POST("/client/business/own-offers/{offer_id}/resume", { params, body });
    case "retire":
      return api.POST("/client/business/own-offers/{offer_id}/retire", { params, body });
  }
}

function postMerchantAction(
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

/** Every owner state change on one of the acting business's offers. */
export function useOwnBusinessOfferAction(owner: BusinessOwner, offerId: string) {
  return useMutation({
    mutationFn: ({ action, ...body }: Schemas["ExpectedVersion"] & { action: OwnOfferAction }) =>
      unwrap(
        owner.kind === "client"
          ? postClientAction(action, owner.id, offerId, body)
          : postMerchantAction(action, owner.id, offerId, body),
      ),
    onSettled: useInvalidateOwn(owner),
  });
}

// --- The acting business: enquiries -----------------------------------------------------

/**
 * Enquires about another business's offer on the acting business's behalf, naming the live
 * version read. The catalogue refetches either way: it shows the open enquiry, and a 409 means
 * the offer changed or an enquiry is already open.
 */
export function useEnquire(owner: BusinessOwner, offerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["EnquiryInput"]) => {
      const path = { offer_id: pathId(offerId) };
      return unwrap(
        owner.kind === "client"
          ? api.POST("/client/business/offers/{offer_id}/enquire", {
              params: { header: clientHeader(owner.id), path },
              body,
            })
          : api.POST("/business/offers/{offer_id}/enquire", {
              params: { header: organizationHeader(owner.id), path },
              body,
            }),
      );
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: businessKeys.catalogue(owner) }),
        queryClient.invalidateQueries({ queryKey: businessKeys.sent(owner) }),
      ]),
  });
}

/** Closes a lead once followed up; the enquiring business is notified and sees the note. */
export function useCloseEnquiry(owner: BusinessOwner, enquiryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["CloseEnquiryInput"]) => {
      const path = { enquiry_id: pathId(enquiryId) };
      return unwrap(
        owner.kind === "client"
          ? api.POST("/client/business/received-enquiries/{enquiry_id}/close", {
              params: { header: clientHeader(owner.id), path },
              body,
            })
          : api.POST("/business/received-enquiries/{enquiry_id}/close", {
              params: { header: organizationHeader(owner.id), path },
              body,
            }),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: businessKeys.received(owner) }),
  });
}
