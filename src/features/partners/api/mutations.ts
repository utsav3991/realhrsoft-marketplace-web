import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import { partnerKeys } from "./queries";

// --- Aayulogic administration ---------------------------------------------------------

/** Assisted intake: registers an existing organization as a pending partner. */
export function useRegisterPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["AssistedRegistration"]) =>
      unwrap(api.POST("/admin/partners", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: partnerKeys.lists() }),
  });
}

/** Refetch on failure too: a 409 means the loaded version or status is stale. */
function useInvalidatePartner(partnerId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: partnerKeys.detail(partnerId) }),
      queryClient.invalidateQueries({ queryKey: partnerKeys.decisions(partnerId) }),
      queryClient.invalidateQueries({ queryKey: partnerKeys.lists() }),
    ]);
}

// --- Client administration (a RealHRSoft client and its companies) ----------------------

function useInvalidateMembers(partnerId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: partnerKeys.members(partnerId) });
}

/** Admits a user as a client member; it grants nothing until a client role is granted. */
export function useAdmitClientMembership(partnerId: string) {
  return useMutation({
    mutationFn: (body: Schemas["ClientMemberInput"]) =>
      unwrap(
        api.POST("/admin/partners/{partner_id}/members", {
          params: { path: { partner_id: pathId(partnerId) } },
          body,
        }),
      ),
    onSettled: useInvalidateMembers(partnerId),
  });
}

export function useEndClientMembership(partnerId: string) {
  return useMutation({
    mutationFn: ({ membershipId, reason }: { membershipId: string; reason: string }) =>
      unwrap(
        api.POST("/admin/partners/{partner_id}/members/{membership_id}/end", {
          params: {
            path: { partner_id: pathId(partnerId), membership_id: pathId(membershipId) },
          },
          body: { reason },
        }),
      ),
    onSettled: useInvalidateMembers(partnerId),
  });
}

/** The client-level Employer opt-in, inherited by companies synchronized later. */
export function useSetEmployerAutoEnable(partnerId: string) {
  return useMutation({
    mutationFn: (body: Schemas["EmployerAutoEnable"]) =>
      unwrap(
        api.POST("/admin/partners/{partner_id}/employer-auto-enable", {
          params: { path: { partner_id: pathId(partnerId) } },
          body,
        }),
      ),
    onSettled: useInvalidatePartner(partnerId),
  });
}

export function useUpdatePartner(partnerId: string) {
  return useMutation({
    mutationFn: (body: Schemas["AssistedUpdate"]) =>
      unwrap(
        api.PUT("/admin/partners/{partner_id}", {
          params: { path: { partner_id: pathId(partnerId) } },
          body,
        }),
      ),
    onSettled: useInvalidatePartner(partnerId),
  });
}

export function useVerifyPartner(partnerId: string) {
  return useMutation({
    mutationFn: (body: Schemas["DecisionInput"]) =>
      unwrap(
        api.POST("/admin/partners/{partner_id}/verify", {
          params: { path: { partner_id: pathId(partnerId) } },
          body,
        }),
      ),
    onSettled: useInvalidatePartner(partnerId),
  });
}

export function useRejectPartner(partnerId: string) {
  return useMutation({
    mutationFn: (body: Schemas["DecisionInput"]) =>
      unwrap(
        api.POST("/admin/partners/{partner_id}/reject", {
          params: { path: { partner_id: pathId(partnerId) } },
          body,
        }),
      ),
    onSettled: useInvalidatePartner(partnerId),
  });
}

export function useResubmitPartner(partnerId: string) {
  return useMutation({
    mutationFn: (body: Schemas["DecisionInput"]) =>
      unwrap(
        api.POST("/admin/partners/{partner_id}/resubmit", {
          params: { path: { partner_id: pathId(partnerId) } },
          body,
        }),
      ),
    onSettled: useInvalidatePartner(partnerId),
  });
}

// --- Partner portal (the selected organization) ----------------------------------------

// The contract types the header as required; the API client sets it from the active
// organization, which is the selected one inside <RequireOrganization>.
function organizationHeader(organizationId: string) {
  return { header: { "X-Organization-ID": organizationId } };
}

/** Self-service registration. The organization gains its Partner capacity in /auth/me. */
export function useRegisterOwnPartner(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["PartnerProfileInput"]) =>
      unwrap(api.POST("/partner/me", { params: organizationHeader(organizationId), body })),
    onSuccess: (partner) => {
      queryClient.setQueryData(partnerKeys.own(organizationId), partner);
      return queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

function useInvalidateOwnPartner(organizationId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: partnerKeys.own(organizationId) });
}

export function useUpdateOwnPartner(organizationId: string) {
  return useMutation({
    mutationFn: (body: Schemas["PartnerProfileUpdate"]) =>
      unwrap(api.PUT("/partner/me", { params: organizationHeader(organizationId), body })),
    onSettled: useInvalidateOwnPartner(organizationId),
  });
}

export function useResubmitOwnPartner(organizationId: string) {
  return useMutation({
    mutationFn: (body: Schemas["ResubmitInput"]) =>
      unwrap(
        api.POST("/partner/me/resubmit", { params: organizationHeader(organizationId), body }),
      ),
    onSettled: useInvalidateOwnPartner(organizationId),
  });
}
