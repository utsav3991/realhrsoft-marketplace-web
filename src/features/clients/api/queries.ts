import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { clientHeader } from "@/features/offers/api/queries";
import { api, pathId, unwrap, type Page, type Schemas } from "@/shared/api";

// The Client portal: a RealHRSoft group (a Partner and all its companies) acting through the
// client selected with X-Client-ID.
export type ClientCompany = Schemas["ClientCompany"];
export type ClientMember = Schemas["ClientMember"];
export type ClientRole = Schemas["ClientRole"];
export type CompanyUsers = Schemas["CompanyUsers"];
export type CompanyUser = Schemas["CompanyUser"];

export const clientKeys = {
  all: (clientId: string) => ["client", clientId] as const,
  companies: (clientId: string) => [...clientKeys.all(clientId), "companies"] as const,
  members: (clientId: string) => [...clientKeys.all(clientId), "members"] as const,
  memberPage: (clientId: string, page: Page) => [...clientKeys.members(clientId), page] as const,
  roles: (clientId: string) => [...clientKeys.all(clientId), "roles"] as const,
  companyUsers: (clientId: string, companyId: string) =>
    [...clientKeys.all(clientId), "company-users", companyId] as const,
};

/** The client's active companies (audience picker, report filters); not paginated. */
export function useClientCompanies(clientId: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: clientKeys.companies(clientId),
    enabled,
    queryFn: ({ signal }) =>
      unwrap(api.GET("/client/companies", { params: { header: clientHeader(clientId) }, signal })),
    staleTime: 60_000,
  });
}

/** Current members with the client roles each holds now, newest admission first. */
export function useClientMembers(clientId: string, page: Page) {
  return useQuery({
    queryKey: clientKeys.memberPage(clientId, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/client/members", {
          params: {
            header: clientHeader(clientId),
            query: { offset: page.offset, limit: page.limit },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

/** Active client roles, each marked grantable when the reader holds all its permissions. */
export function useClientRoles(clientId: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: clientKeys.roles(clientId),
    enabled,
    queryFn: ({ signal }) =>
      unwrap(api.GET("/client/roles", { params: { header: clientHeader(clientId) }, signal })),
  });
}

/** A company's current users and how many more the client may add (the limit is per company). */
export function useCompanyUsers(clientId: string, companyId: string) {
  return useQuery({
    queryKey: clientKeys.companyUsers(clientId, companyId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/client/companies/{company_id}/users", {
          params: { header: clientHeader(clientId), path: { company_id: pathId(companyId) } },
          signal,
        }),
      ),
  });
}
