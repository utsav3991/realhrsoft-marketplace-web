import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import { organizationKeys } from "./queries";

type BusinessDetails = Schemas["BusinessDetailsBody"];

function useInvalidateOrganization() {
  const queryClient = useQueryClient();
  return (organizationId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(organizationId) }),
      queryClient.invalidateQueries({ queryKey: organizationKeys.members(organizationId) }),
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() }),
    ]);
}

// --- Organizations and membership ------------------------------------------------------------

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["CreateOrganizationRequest"]) =>
      unwrap(api.POST("/admin/organizations", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.lists() }),
  });
}

export function useAddMember(organizationId: string) {
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: (body: Schemas["AddMemberRequest"]) =>
      unwrap(
        api.POST("/admin/organizations/{organization_id}/members", {
          params: { path: { organization_id: pathId(organizationId) } },
          body,
        }),
      ),
    onSettled: () => invalidate(organizationId),
  });
}

export function useRemoveMember(organizationId: string) {
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      unwrap(
        api.POST("/admin/organizations/{organization_id}/members/{user_id}/remove", {
          params: { path: { organization_id: pathId(organizationId), user_id: pathId(userId) } },
          body: { reason },
        }),
      ),
    onSettled: () => invalidate(organizationId),
  });
}

export function useChangeEmployerProfile(organizationId: string) {
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: ({ action, reason }: { action: "enable" | "disable"; reason: string }) =>
      unwrap(
        api.POST("/admin/organizations/{organization_id}/employer-profile/{action}", {
          params: { path: { organization_id: pathId(organizationId), action } },
          body: { reason },
        }),
      ),
    onSettled: () => invalidate(organizationId),
  });
}

export function useChangePartnerProfile(organizationId: string) {
  const invalidate = useInvalidateOrganization();
  return useMutation({
    mutationFn: ({ action, reason }: { action: "suspend" | "reinstate"; reason: string }) =>
      unwrap(
        api.POST("/admin/organizations/{organization_id}/partner-profile/{action}", {
          params: { path: { organization_id: pathId(organizationId), action } },
          body: { reason },
        }),
      ),
    onSettled: () => invalidate(organizationId),
  });
}

// --- Partner applications: review ----------------------------------------------------------------

export function useCreateAssistedApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["AssistedApplicationRequest"]) =>
      unwrap(api.POST("/admin/partner-applications", { body })),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizationKeys.applicationLists() }),
  });
}

export type ApplicationDecision = "reject" | "request-changes";

export function useDecideApplication(applicationId: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: organizationKeys.application(applicationId) }),
      queryClient.invalidateQueries({ queryKey: organizationKeys.applicationLists() }),
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() }),
    ]);
  const path = { application_id: pathId(applicationId) };

  const verify = useMutation({
    mutationFn: (body: Schemas["VerifyApplicationRequest"]) =>
      unwrap(
        api.POST("/admin/partner-applications/{application_id}/verify", { params: { path }, body }),
      ),
    // Refetch on failure too: a 409 means the loaded version is stale.
    onSettled: invalidate,
  });
  const decide = useMutation({
    mutationFn: ({
      decision,
      ...body
    }: { decision: ApplicationDecision } & Schemas["VersionedReasonRequest"]) =>
      decision === "reject"
        ? unwrap(
            api.POST("/admin/partner-applications/{application_id}/reject", {
              params: { path },
              body,
            }),
          )
        : unwrap(
            api.POST("/admin/partner-applications/{application_id}/request-changes", {
              params: { path },
              body,
            }),
          ),
    onSettled: invalidate,
  });
  return { verify, decide };
}

// --- Partner applications: applicant ---------------------------------------------------------------

export function useSubmitApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BusinessDetails) => unwrap(api.POST("/partner/applications", { body })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: organizationKeys.myApplication() }),
  });
}

export function useCorrectApplication(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["CorrectApplicationRequest"]) =>
      unwrap(
        api.PATCH("/partner/applications/{application_id}", {
          params: { path: { application_id: pathId(applicationId) } },
          body,
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: organizationKeys.myApplication() }),
  });
}

export function useResubmitApplication(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["VersionRequest"]) =>
      unwrap(
        api.POST("/partner/applications/{application_id}/resubmit", {
          params: { path: { application_id: pathId(applicationId) } },
          body,
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: organizationKeys.myApplication() }),
  });
}

// --- Partner profile (organization-scoped) -----------------------------------------------------------

export function useUpdatePartnerProfile(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["UpdatePartnerProfileRequest"]) =>
      unwrap(api.PATCH("/partner/profile", { body })),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: organizationKeys.partnerProfile(organizationId) }),
  });
}
