import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { api, pathId, unwrap } from "@/shared/api";

export type ApplicationStatus = "submitted" | "changes_requested" | "verified" | "rejected";

export const organizationKeys = {
  all: ["organizations"] as const,
  lists: () => [...organizationKeys.all, "list"] as const,
  list: (q: string) => [...organizationKeys.lists(), q] as const,
  detail: (id: string) => [...organizationKeys.all, "detail", id] as const,
  members: (id: string) => [...organizationKeys.all, "members", id] as const,
  applicationLists: () => [...organizationKeys.all, "applications"] as const,
  applications: (status: ApplicationStatus | undefined) =>
    [...organizationKeys.applicationLists(), status ?? "all"] as const,
  application: (id: string) => [...organizationKeys.all, "application", id] as const,
  myApplication: () => [...organizationKeys.all, "my-application"] as const,
  // Portal reads are keyed by the organization they were fetched under.
  partnerProfile: (organizationId: string) =>
    [...organizationKeys.all, "partner-profile", organizationId] as const,
  employerProfile: (organizationId: string) =>
    [...organizationKeys.all, "employer-profile", organizationId] as const,
};

const PAGE_SIZE = 50;

// --- Administration ------------------------------------------------------------------------

export function useOrganizations(q: string) {
  return useInfiniteQuery({
    queryKey: organizationKeys.list(q),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/admin/organizations", {
          params: {
            query: { q: q || undefined, cursor: pageParam ?? undefined, limit: PAGE_SIZE },
          },
          signal,
        }),
      ),
    getNextPageParam: (page) => page.next_cursor,
  });
}

export function useOrganization(organizationId: string) {
  return useQuery({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/organizations/{organization_id}", {
          params: { path: { organization_id: pathId(organizationId) } },
          signal,
        }),
      ),
  });
}

export function useMembers(organizationId: string) {
  return useQuery({
    queryKey: organizationKeys.members(organizationId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/organizations/{organization_id}/members", {
          params: { path: { organization_id: pathId(organizationId) } },
          signal,
        }),
      ),
  });
}

export function usePartnerApplications(status: ApplicationStatus | undefined) {
  return useInfiniteQuery({
    queryKey: organizationKeys.applications(status),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/admin/partner-applications", {
          params: { query: { status, cursor: pageParam ?? undefined, limit: PAGE_SIZE } },
          signal,
        }),
      ),
    getNextPageParam: (page) => page.next_cursor,
  });
}

export function usePartnerApplication(applicationId: string) {
  return useQuery({
    queryKey: organizationKeys.application(applicationId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/partner-applications/{application_id}", {
          params: { path: { application_id: pathId(applicationId) } },
          signal,
        }),
      ),
  });
}

// --- Applicant -------------------------------------------------------------------------------

/** The signed-in account's own application. A 404 means none has been submitted. */
export function useMyApplication() {
  return useQuery({
    queryKey: organizationKeys.myApplication(),
    queryFn: ({ signal }) => unwrap(api.GET("/partner/applications/mine", { signal })),
    retry: false,
  });
}

// --- Portals (organization-scoped) -------------------------------------------------------------

export function usePartnerProfile(organizationId: string) {
  return useQuery({
    queryKey: organizationKeys.partnerProfile(organizationId),
    queryFn: ({ signal }) => unwrap(api.GET("/partner/profile", { signal })),
  });
}

export function useEmployerProfile(organizationId: string) {
  return useQuery({
    queryKey: organizationKeys.employerProfile(organizationId),
    queryFn: ({ signal }) => unwrap(api.GET("/employer/profile", { signal })),
  });
}
