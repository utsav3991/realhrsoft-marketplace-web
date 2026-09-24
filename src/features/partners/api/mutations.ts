import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import { partnerKeys } from "./queries";

/**
 * Which Partner a profile, contact or location change acts on: the applicant's own
 * registration (before verification, by ID) or the Partner of the selected organization
 * (portal; the backend takes the organization from X-Organization-ID, never from the request).
 */
export type PartnerTarget =
  { kind: "registration"; partnerId: string } | { kind: "organization"; organizationId: string };

type ProfileBody = Schemas["UpdateProfileRequest"];
type ContactBody = Schemas["UpdateContactRequest"];
type AddContactBody = Schemas["AddContactRequest"];
type LocationBody = Schemas["LocationBody"];

function useInvalidateTarget(target: PartnerTarget) {
  const queryClient = useQueryClient();
  // Refetch on failure too: a 409 means the loaded version is stale.
  return () =>
    queryClient.invalidateQueries({
      queryKey:
        target.kind === "registration"
          ? partnerKeys.registration()
          : partnerKeys.own(target.organizationId),
    });
}

function registrationPath(target: PartnerTarget & { kind: "registration" }) {
  return { partner_id: pathId(target.partnerId) };
}

// --- Registration (applicant) ------------------------------------------------------------------

export function useRegisterPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["BusinessProfileBody"]) =>
      unwrap(api.POST("/partner/registration", { body })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: partnerKeys.registration() }),
  });
}

export function useSubmitRegistration(partnerId: string) {
  const invalidate = useInvalidateTarget({ kind: "registration", partnerId });
  return useMutation({
    mutationFn: (version: number) =>
      unwrap(
        api.POST("/partner/registration/{partner_id}/submit", {
          params: { path: { partner_id: pathId(partnerId) } },
          body: { version },
        }),
      ),
    onSettled: invalidate,
  });
}

export function useRemoveDocument(partnerId: string) {
  const invalidate = useInvalidateTarget({ kind: "registration", partnerId });
  return useMutation({
    mutationFn: ({ documentId, version }: { documentId: string; version: number }) =>
      unwrap(
        api.DELETE("/partner/registration/{partner_id}/documents/{document_id}", {
          params: {
            path: { partner_id: pathId(partnerId), document_id: pathId(documentId) },
            query: { version },
          },
        }),
      ),
    onSettled: invalidate,
  });
}

// --- Profile, contacts and locations (registration or portal) ---------------------------------

export function useUpdatePartnerProfile(target: PartnerTarget) {
  const invalidate = useInvalidateTarget(target);
  return useMutation({
    mutationFn: (body: ProfileBody) =>
      target.kind === "registration"
        ? unwrap(
            api.PATCH("/partner/registration/{partner_id}", {
              params: { path: registrationPath(target) },
              body,
            }),
          )
        : unwrap(api.PATCH("/partner/me", { body })),
    onSettled: invalidate,
  });
}

export function useAddContact(target: PartnerTarget) {
  const invalidate = useInvalidateTarget(target);
  return useMutation({
    mutationFn: (body: AddContactBody) =>
      target.kind === "registration"
        ? unwrap(
            api.POST("/partner/registration/{partner_id}/contacts", {
              params: { path: registrationPath(target) },
              body,
            }),
          )
        : unwrap(api.POST("/partner/me/contacts", { body })),
    onSettled: invalidate,
  });
}

export function useUpdateContact(target: PartnerTarget) {
  const invalidate = useInvalidateTarget(target);
  return useMutation({
    mutationFn: ({ contactId, body }: { contactId: string; body: ContactBody }) =>
      target.kind === "registration"
        ? unwrap(
            api.PATCH("/partner/registration/{partner_id}/contacts/{contact_id}", {
              params: { path: { ...registrationPath(target), contact_id: pathId(contactId) } },
              body,
            }),
          )
        : unwrap(
            api.PATCH("/partner/me/contacts/{contact_id}", {
              params: { path: { contact_id: pathId(contactId) } },
              body,
            }),
          ),
    onSettled: invalidate,
  });
}

export function useRemoveContact(target: PartnerTarget) {
  const invalidate = useInvalidateTarget(target);
  return useMutation({
    mutationFn: ({ contactId, version }: { contactId: string; version: number }) =>
      target.kind === "registration"
        ? unwrap(
            api.DELETE("/partner/registration/{partner_id}/contacts/{contact_id}", {
              params: {
                path: { ...registrationPath(target), contact_id: pathId(contactId) },
                query: { version },
              },
            }),
          )
        : unwrap(
            api.DELETE("/partner/me/contacts/{contact_id}", {
              params: { path: { contact_id: pathId(contactId) }, query: { version } },
            }),
          ),
    onSettled: invalidate,
  });
}

export function useAddLocation(target: PartnerTarget) {
  const invalidate = useInvalidateTarget(target);
  return useMutation({
    mutationFn: (body: LocationBody) =>
      target.kind === "registration"
        ? unwrap(
            api.POST("/partner/registration/{partner_id}/locations", {
              params: { path: registrationPath(target) },
              body,
            }),
          )
        : unwrap(api.POST("/partner/me/locations", { body })),
    onSettled: invalidate,
  });
}

export function useUpdateLocation(target: PartnerTarget) {
  const invalidate = useInvalidateTarget(target);
  return useMutation({
    mutationFn: ({ locationId, body }: { locationId: string; body: LocationBody }) =>
      target.kind === "registration"
        ? unwrap(
            api.PATCH("/partner/registration/{partner_id}/locations/{location_id}", {
              params: { path: { ...registrationPath(target), location_id: pathId(locationId) } },
              body,
            }),
          )
        : unwrap(
            api.PATCH("/partner/me/locations/{location_id}", {
              params: { path: { location_id: pathId(locationId) } },
              body,
            }),
          ),
    onSettled: invalidate,
  });
}

export function useRemoveLocation(target: PartnerTarget) {
  const invalidate = useInvalidateTarget(target);
  return useMutation({
    mutationFn: ({ locationId, version }: { locationId: string; version: number }) =>
      target.kind === "registration"
        ? unwrap(
            api.DELETE("/partner/registration/{partner_id}/locations/{location_id}", {
              params: {
                path: { ...registrationPath(target), location_id: pathId(locationId) },
                query: { version },
              },
            }),
          )
        : unwrap(
            api.DELETE("/partner/me/locations/{location_id}", {
              params: { path: { location_id: pathId(locationId) }, query: { version } },
            }),
          ),
    onSettled: invalidate,
  });
}

// --- Administration ------------------------------------------------------------------------------

export function useAssistedRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["AssistedRegistrationRequest"]) =>
      unwrap(api.POST("/admin/partners", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partnerKeys.lists() }),
  });
}

function useInvalidatePartner(partnerId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: partnerKeys.detail(partnerId) }),
      queryClient.invalidateQueries({ queryKey: partnerKeys.lists() }),
    ]);
}

export type ReviewDecision = "reject" | "request-changes";
export type StandingAction = "suspend" | "reinstate" | "close";

/** Interim Governance review (organizations.partner_verification.review). */
export function usePartnerReview(partnerId: string) {
  const invalidate = useInvalidatePartner(partnerId);
  const path = { partner_id: pathId(partnerId) };
  const startReview = useMutation({
    mutationFn: (version: number) =>
      unwrap(
        api.POST("/admin/partners/{partner_id}/start-review", {
          params: { path },
          body: { version },
        }),
      ),
    onSettled: invalidate,
  });
  const verify = useMutation({
    mutationFn: (body: Schemas["VerifyRequest"]) =>
      unwrap(api.POST("/admin/partners/{partner_id}/verify", { params: { path }, body })),
    onSettled: invalidate,
  });
  const decide = useMutation({
    mutationFn: ({
      decision,
      ...body
    }: { decision: ReviewDecision } & Schemas["PartnerDecisionRequest"]) =>
      decision === "reject"
        ? unwrap(api.POST("/admin/partners/{partner_id}/reject", { params: { path }, body }))
        : unwrap(
            api.POST("/admin/partners/{partner_id}/request-changes", { params: { path }, body }),
          ),
    onSettled: invalidate,
  });
  return { startReview, verify, decide };
}

export function usePartnerStanding(partnerId: string) {
  const invalidate = useInvalidatePartner(partnerId);
  return useMutation({
    mutationFn: ({
      action,
      ...body
    }: { action: StandingAction } & Schemas["PartnerDecisionRequest"]) =>
      unwrap(
        api.POST("/admin/partners/{partner_id}/{action}", {
          params: { path: { partner_id: pathId(partnerId), action } },
          body,
        }),
      ),
    onSettled: invalidate,
  });
}
