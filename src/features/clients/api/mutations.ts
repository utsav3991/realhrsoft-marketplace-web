import { useMutation, useQueryClient } from "@tanstack/react-query";

import { clientHeader } from "@/features/offers/api/queries";
import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import { clientKeys } from "./queries";

// Every client administration change reloads the members, even on failure: a 409 means
// another administrator changed them first.
function useInvalidateMembers(clientId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: clientKeys.members(clientId) });
}

/** Admits an existing account by email; membership alone grants nothing. */
export function useAdmitClientMember(clientId: string) {
  return useMutation({
    mutationFn: (body: Schemas["ClientMemberAdmit"]) =>
      unwrap(api.POST("/client/members", { params: { header: clientHeader(clientId) }, body })),
    onSettled: useInvalidateMembers(clientId),
  });
}

export function useEndClientMember(clientId: string) {
  return useMutation({
    mutationFn: ({ membershipId, reason }: { membershipId: string; reason: string }) =>
      unwrap(
        api.POST("/client/members/{membership_id}/end", {
          params: {
            header: clientHeader(clientId),
            path: { membership_id: pathId(membershipId) },
          },
          body: { reason },
        }),
      ),
    onSettled: useInvalidateMembers(clientId),
  });
}

export function useGrantClientRole(clientId: string) {
  return useMutation({
    mutationFn: ({
      membershipId,
      ...body
    }: Schemas["ClientRoleGrant"] & { membershipId: string }) =>
      unwrap(
        api.POST("/client/members/{membership_id}/roles", {
          params: {
            header: clientHeader(clientId),
            path: { membership_id: pathId(membershipId) },
          },
          body,
        }),
      ),
    onSettled: useInvalidateMembers(clientId),
  });
}

export function useRevokeClientRole(clientId: string) {
  return useMutation({
    mutationFn: ({
      membershipId,
      assignmentId,
      reason,
    }: {
      membershipId: string;
      assignmentId: string;
      reason: string;
    }) =>
      unwrap(
        api.POST("/client/members/{membership_id}/roles/{assignment_id}/revoke", {
          params: {
            header: clientHeader(clientId),
            path: {
              membership_id: pathId(membershipId),
              assignment_id: pathId(assignmentId),
            },
          },
          body: { reason },
        }),
      ),
    onSettled: useInvalidateMembers(clientId),
  });
}

// --- Company users ------------------------------------------------------------------------

function useInvalidateCompanyUsers(clientId: string, companyId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: clientKeys.companyUsers(clientId, companyId) });
}

/**
 * Adds (or links) a user to one company with the company_user role. A new account is emailed
 * a set-password link; 409 COMPANY_USER_LIMIT when the company is full.
 */
export function useAddCompanyUser(clientId: string, companyId: string) {
  return useMutation({
    mutationFn: (body: Schemas["CompanyUserCreate"]) =>
      unwrap(
        api.POST("/client/companies/{company_id}/users", {
          params: { header: clientHeader(clientId), path: { company_id: pathId(companyId) } },
          body,
        }),
      ),
    onSettled: useInvalidateCompanyUsers(clientId, companyId),
  });
}

/** Ends a company user's membership, which frees a slot. */
export function useEndCompanyUser(clientId: string, companyId: string) {
  return useMutation({
    mutationFn: ({ membershipId, reason }: { membershipId: string; reason: string }) =>
      unwrap(
        api.POST("/client/companies/{company_id}/users/{membership_id}/end", {
          params: {
            header: clientHeader(clientId),
            path: { company_id: pathId(companyId), membership_id: pathId(membershipId) },
          },
          body: { reason },
        }),
      ),
    onSettled: useInvalidateCompanyUsers(clientId, companyId),
  });
}

/** Emails a pending company user a new set-password link; earlier links stop working. */
export function useResendCompanyUserSetup(clientId: string, companyId: string) {
  return useMutation({
    mutationFn: ({ membershipId, reason }: { membershipId: string; reason: string }) =>
      unwrap(
        api.POST("/client/companies/{company_id}/users/{membership_id}/resend-setup", {
          params: {
            header: clientHeader(clientId),
            path: { company_id: pathId(companyId), membership_id: pathId(membershipId) },
          },
          body: { reason },
        }),
      ),
    onSettled: useInvalidateCompanyUsers(clientId, companyId),
  });
}
