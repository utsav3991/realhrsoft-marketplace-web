import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { api, pathId, unwrap, type Schemas } from "@/shared/api";

/**
 * Partner Management reads (ADR-016/017). The legacy ADR-014 Partner application and profile
 * were migrated into this model and retired, so these are the only Partner reads.
 */

export type PartnerProfile = Schemas["PartnerProfileView"];
export type PartnerListItem = Schemas["PartnerAdminListItem"];
export type PartnerVerification = Schemas["PartnerVerificationView"];
export type PartnerRequirement = Schemas["PartnerRequirementView"];
export type PartnerEligibility = Schemas["PartnerMarketplaceEligibilityView"];

export const VERIFICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "changes_requested",
  "verified",
  "rejected",
] as const;
export const OPERATIONAL_STATUSES = ["active", "suspended", "closed"] as const;
export const PARTNER_SORTS = ["created_at", "-created_at"] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number];
export type PartnerSort = (typeof PARTNER_SORTS)[number];

export interface PartnerSearch {
  /** Only verified Partners (`/admin/partners/verified`); `verificationStatus` is then ignored. */
  verifiedOnly: boolean;
  search: string;
  verificationStatus?: VerificationStatus;
  operationalStatus?: OperationalStatus;
  organizationId?: string;
  sort: PartnerSort;
}

export const partnerKeys = {
  all: ["partners"] as const,
  lists: () => [...partnerKeys.all, "list"] as const,
  list: (filters: PartnerSearch) => [...partnerKeys.lists(), filters] as const,
  detail: (partnerId: string) => [...partnerKeys.all, "detail", partnerId] as const,
  verification: (partnerId: string) => [...partnerKeys.detail(partnerId), "verification"] as const,
  registration: () => [...partnerKeys.all, "registration"] as const,
  // Portal reads are keyed by the organization they were fetched under.
  own: (organizationId: string) => [...partnerKeys.all, "own", organizationId] as const,
  ownVerification: (organizationId: string) =>
    [...partnerKeys.own(organizationId), "verification"] as const,
  ownRequirements: (organizationId: string) =>
    [...partnerKeys.own(organizationId), "requirements"] as const,
  ownEligibility: (organizationId: string) =>
    [...partnerKeys.own(organizationId), "eligibility"] as const,
};

const PAGE_SIZE = 50;

// --- Administration ------------------------------------------------------------------------

/** Keyset pages. Filters and sort stay fixed while following a cursor (the query key holds them). */
export function usePartners(filters: PartnerSearch) {
  return useInfiniteQuery({
    queryKey: partnerKeys.list(filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      const common = {
        search: filters.search || undefined,
        operational_status: filters.operationalStatus,
        organization_id: filters.organizationId,
        sort: filters.sort,
        cursor: pageParam ?? undefined,
        limit: PAGE_SIZE,
      };
      return filters.verifiedOnly
        ? unwrap(api.GET("/admin/partners/verified", { params: { query: common }, signal }))
        : unwrap(
            api.GET("/admin/partners", {
              params: { query: { ...common, verification_status: filters.verificationStatus } },
              signal,
            }),
          );
    },
    getNextPageParam: (page) => page.next_cursor,
  });
}

export function usePartner(partnerId: string) {
  return useQuery({
    queryKey: partnerKeys.detail(partnerId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/partners/{partner_id}", {
          params: { path: { partner_id: pathId(partnerId) } },
          signal,
        }),
      ),
  });
}

/** Administrative: the Partner's verification, requirements, documents and review note. */
export function usePartnerVerification(partnerId: string) {
  return useQuery({
    queryKey: partnerKeys.verification(partnerId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/partners/{partner_id}/verification", {
          params: { path: { partner_id: pathId(partnerId) } },
          signal,
        }),
      ),
  });
}

// --- Applicant -------------------------------------------------------------------------------

/**
 * The signed-in applicant's own Partner before verification attaches it to an organization.
 * A 404 means there is none (or it is already attached: read it through the portal instead).
 */
export function usePartnerRegistration({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: partnerKeys.registration(),
    queryFn: ({ signal }) => unwrap(api.GET("/partner/registration", { signal })),
    enabled,
    retry: false,
  });
}

// --- Portal (organization-scoped) -------------------------------------------------------------

export function useOwnPartner(organizationId: string) {
  return useQuery({
    queryKey: partnerKeys.own(organizationId),
    queryFn: ({ signal }) => unwrap(api.GET("/partner/me", { signal })),
    retry: false,
  });
}

export function useOwnPartnerVerification(organizationId: string) {
  return useQuery({
    queryKey: partnerKeys.ownVerification(organizationId),
    queryFn: ({ signal }) => unwrap(api.GET("/partner/me/verification-status", { signal })),
    retry: false,
  });
}

export function useOwnPartnerRequirements(organizationId: string) {
  return useQuery({
    queryKey: partnerKeys.ownRequirements(organizationId),
    queryFn: ({ signal }) => unwrap(api.GET("/partner/me/verification-requirements", { signal })),
    retry: false,
  });
}

export function useOwnPartnerEligibility(organizationId: string) {
  return useQuery({
    queryKey: partnerKeys.ownEligibility(organizationId),
    queryFn: ({ signal }) => unwrap(api.GET("/partner/me/marketplace-eligibility", { signal })),
    retry: false,
  });
}
