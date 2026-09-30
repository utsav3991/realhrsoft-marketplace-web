import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import type { SortOrdering } from "@/design-system/components/data-table";
import type { DisplayStatus } from "@/features/offers/api/queries";
import { api, nextOffset, PAGE_SIZE, pathId, unwrap, type Page, type Schemas } from "@/shared/api";

// Business (B2B) offers are `business_offer` offers: the Offer and OfferVersion shapes of the
// offer engine, with a version's business_policy (business audience, enquiry instructions and
// the employee switch). Organizations enquire about them; they never claim them.
export type BusinessAudience = Schemas["BusinessAudienceTypeEnum"];
export type CatalogueOffer = Schemas["BusinessCatalogueOffer"];
export type Enquiry = Schemas["BusinessEnquiry"];
export type EnquiryStatus = Schemas["EnquiryStatusEnum"];

/** Business offer columns the API sorts by (`ordering`). */
export const BUSINESS_OFFER_SORTS = ["first_published_at", "updated_at", "created_at"] as const;
export type BusinessOfferOrdering = SortOrdering<(typeof BUSINESS_OFFER_SORTS)[number]>;
export const ENQUIRY_SORTS = ["created_at", "closed_at"] as const;
export type EnquiryOrdering = SortOrdering<(typeof ENQUIRY_SORTS)[number]>;

export interface BusinessOfferFilters {
  search: string;
  status: DisplayStatus | null;
  /** The review queue: offers whose working version awaits review, live or not. */
  inReview: boolean | null;
  showToEmployees: boolean | null;
  /** Administrators: the offers posted in this verified partner's capacity. */
  partnerId: string | null;
  /** Administrators: offers whose business audience names this organization. */
  organizationId: string | null;
  ordering: BusinessOfferOrdering | null;
}

export interface EnquiryFilters {
  search: string;
  status: EnquiryStatus | null;
  offerId: string | null;
  ordering: EnquiryOrdering | null;
}

export interface CatalogueFilters {
  search: string;
  categoryId: string | null;
}

export const businessKeys = {
  all: ["business"] as const,
  // Aayulogic administration
  admin: () => [...businessKeys.all, "admin"] as const,
  adminLists: () => [...businessKeys.admin(), "list"] as const,
  adminList: (filters: BusinessOfferFilters, page: Page) =>
    [...businessKeys.adminLists(), filters, page] as const,
  adminDetail: (id: string) => [...businessKeys.admin(), "detail", id] as const,
  adminVersions: (id: string, page: Page) => [...businessKeys.admin(), "versions", id, page] as const,
  adminDecisions: (id: string, page: Page) =>
    [...businessKeys.admin(), "decisions", id, page] as const,
  adminEnquiries: () => [...businessKeys.admin(), "enquiries"] as const,
  adminEnquiryList: (filters: EnquiryFilters, page: Page) =>
    [...businessKeys.adminEnquiries(), "list", filters, page] as const,
  adminEnquiry: (id: string) => [...businessKeys.adminEnquiries(), "detail", id] as const,
  // The selected organization (Business portal)
  organization: (organizationId: string) => [...businessKeys.all, organizationId] as const,
  own: (organizationId: string) => [...businessKeys.organization(organizationId), "own"] as const,
  ownList: (organizationId: string, filters: BusinessOfferFilters, page: Page) =>
    [...businessKeys.own(organizationId), "list", filters, page] as const,
  ownDetail: (organizationId: string, id: string) =>
    [...businessKeys.own(organizationId), "detail", id] as const,
  ownVersions: (organizationId: string, id: string, page: Page) =>
    [...businessKeys.own(organizationId), "versions", id, page] as const,
  ownDecisions: (organizationId: string, id: string, page: Page) =>
    [...businessKeys.own(organizationId), "decisions", id, page] as const,
  ownCategories: (organizationId: string) =>
    [...businessKeys.organization(organizationId), "own-categories"] as const,
  directory: (organizationId: string, search: string) =>
    [...businessKeys.organization(organizationId), "directory", search] as const,
  catalogue: (organizationId: string) =>
    [...businessKeys.organization(organizationId), "catalogue"] as const,
  catalogueList: (organizationId: string, filters: CatalogueFilters) =>
    [...businessKeys.catalogue(organizationId), "list", filters] as const,
  catalogueDetail: (organizationId: string, id: string) =>
    [...businessKeys.catalogue(organizationId), "detail", id] as const,
  catalogueCategories: (organizationId: string) =>
    [...businessKeys.catalogue(organizationId), "categories"] as const,
  sent: (organizationId: string) => [...businessKeys.organization(organizationId), "sent"] as const,
  sentList: (organizationId: string, filters: EnquiryFilters, page: Page) =>
    [...businessKeys.sent(organizationId), "list", filters, page] as const,
  sentDetail: (organizationId: string, id: string) =>
    [...businessKeys.sent(organizationId), "detail", id] as const,
  received: (organizationId: string) =>
    [...businessKeys.organization(organizationId), "received"] as const,
  receivedList: (organizationId: string, filters: EnquiryFilters, page: Page) =>
    [...businessKeys.received(organizationId), "list", filters, page] as const,
  receivedDetail: (organizationId: string, id: string) =>
    [...businessKeys.received(organizationId), "detail", id] as const,
};

function offerQuery(filters: BusinessOfferFilters, page: Page) {
  return {
    search: filters.search || undefined,
    display_status: filters.status ?? undefined,
    in_review: filters.inReview ?? undefined,
    show_to_employees: filters.showToEmployees ?? undefined,
    partner_id: filters.partnerId ?? undefined,
    organization_id: filters.organizationId ?? undefined,
    ordering: filters.ordering ? [filters.ordering] : undefined,
    offset: page.offset,
    limit: page.limit,
  };
}

function enquiryQuery(filters: EnquiryFilters, page: Page) {
  return {
    search: filters.search || undefined,
    status: filters.status ?? undefined,
    offer_id: filters.offerId ?? undefined,
    ordering: filters.ordering ? [filters.ordering] : undefined,
    offset: page.offset,
    limit: page.limit,
  };
}

// The contract types the header as required; the API client sets it from the active
// organization, which is the selected one inside <RequireOrganization>.
function organizationHeader(organizationId: string) {
  return { "X-Organization-ID": organizationId };
}

// --- Aayulogic administration ---------------------------------------------------------

/** Every organization's business offers; the review queue is in_review=true. */
export function useAdminBusinessOffers(filters: BusinessOfferFilters, page: Page) {
  return useQuery({
    queryKey: businessKeys.adminList(filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/business-offers", { params: { query: offerQuery(filters, page) }, signal }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminBusinessOffer(offerId: string) {
  return useQuery({
    queryKey: businessKeys.adminDetail(offerId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/business-offers/{offer_id}", {
          params: { path: { offer_id: pathId(offerId) } },
          signal,
        }),
      ),
  });
}

export function useAdminBusinessOfferVersions(offerId: string, page: Page) {
  return useQuery({
    queryKey: businessKeys.adminVersions(offerId, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/business-offers/{offer_id}/versions", {
          params: {
            path: { offer_id: pathId(offerId) },
            query: { offset: page.offset, limit: page.limit },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminBusinessOfferDecisions(offerId: string, page: Page) {
  return useQuery({
    queryKey: businessKeys.adminDecisions(offerId, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/business-offers/{offer_id}/decisions", {
          params: {
            path: { offer_id: pathId(offerId) },
            query: { offset: page.offset, limit: page.limit },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

/** Every organization's enquiries (offers.business_enquiry.view). */
export function useAdminEnquiries(filters: EnquiryFilters, page: Page) {
  return useQuery({
    queryKey: businessKeys.adminEnquiryList(filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/business-enquiries", {
          params: { query: enquiryQuery(filters, page) },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminEnquiry(enquiryId: string) {
  return useQuery({
    queryKey: businessKeys.adminEnquiry(enquiryId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/business-enquiries/{enquiry_id}", {
          params: { path: { enquiry_id: pathId(enquiryId) } },
          signal,
        }),
      ),
  });
}

// --- Business portal: own offers ------------------------------------------------------

export function useOwnBusinessOffers(
  organizationId: string,
  filters: BusinessOfferFilters,
  page: Page,
  { enabled = true } = {},
) {
  return useQuery({
    enabled,
    queryKey: businessKeys.ownList(organizationId, filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/business/own-offers", {
          params: { header: organizationHeader(organizationId), query: offerQuery(filters, page) },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useOwnBusinessOffer(organizationId: string, offerId: string) {
  return useQuery({
    queryKey: businessKeys.ownDetail(organizationId, offerId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/business/own-offers/{offer_id}", {
          params: {
            header: organizationHeader(organizationId),
            path: { offer_id: pathId(offerId) },
          },
          signal,
        }),
      ),
  });
}

export function useOwnBusinessOfferVersions(organizationId: string, offerId: string, page: Page) {
  return useQuery({
    queryKey: businessKeys.ownVersions(organizationId, offerId, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/business/own-offers/{offer_id}/versions", {
          params: {
            header: organizationHeader(organizationId),
            path: { offer_id: pathId(offerId) },
            query: { offset: page.offset, limit: page.limit },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useOwnBusinessOfferDecisions(organizationId: string, offerId: string, page: Page) {
  return useQuery({
    queryKey: businessKeys.ownDecisions(organizationId, offerId, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/business/own-offers/{offer_id}/decisions", {
          params: {
            header: organizationHeader(organizationId),
            path: { offer_id: pathId(offerId) },
            query: { offset: page.offset, limit: page.limit },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

/** Active categories the selected organization may choose; not paginated. */
export function useOwnBusinessCategories(organizationId: string) {
  return useQuery({
    queryKey: businessKeys.ownCategories(organizationId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/business/own-offer-categories", {
          params: { header: organizationHeader(organizationId) },
          signal,
        }),
      ),
  });
}

/** Other businesses (names only) to choose as a business offer's audience; first page. */
export function useBusinessDirectory(organizationId: string, search: string) {
  return useQuery({
    queryKey: businessKeys.directory(organizationId, search),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/business/organizations", {
          params: {
            header: organizationHeader(organizationId),
            query: { search: search || undefined, offset: 0, limit: PAGE_SIZE },
          },
          signal,
        }),
      ),
  });
}

// --- Business portal: catalogue ---------------------------------------------------------

/** Other organizations' live business offers available to the selected one, newest first. */
export function useBusinessCatalogue(organizationId: string, filters: CatalogueFilters) {
  return useInfiniteQuery({
    queryKey: businessKeys.catalogueList(organizationId, filters),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/business/offers", {
          params: {
            header: organizationHeader(organizationId),
            query: {
              search: filters.search || undefined,
              category_id: filters.categoryId ?? undefined,
              offset: pageParam,
              limit: PAGE_SIZE,
            },
          },
          signal,
        }),
      ),
    getNextPageParam: nextOffset,
  });
}

export function useBusinessCatalogueOffer(organizationId: string, offerId: string) {
  return useQuery({
    queryKey: businessKeys.catalogueDetail(organizationId, offerId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/business/offers/{offer_id}", {
          params: {
            header: organizationHeader(organizationId),
            path: { offer_id: pathId(offerId) },
          },
          signal,
        }),
      ),
  });
}

/** Categories with at least one offer in the selected organization's catalogue now. */
export function useBusinessCatalogueCategories(organizationId: string) {
  return useQuery({
    queryKey: businessKeys.catalogueCategories(organizationId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/business/offer-categories", {
          params: { header: organizationHeader(organizationId) },
          signal,
        }),
      ),
  });
}

// --- Business portal: enquiries ---------------------------------------------------------

/** Enquiries the selected organization sent, open or closed. */
export function useSentEnquiries(organizationId: string, filters: EnquiryFilters, page: Page,
  { enabled = true } = {},
) {
  return useQuery({
    enabled,
    queryKey: businessKeys.sentList(organizationId, filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/business/enquiries", {
          params: {
            header: organizationHeader(organizationId),
            query: enquiryQuery(filters, page),
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useSentEnquiry(organizationId: string, enquiryId: string) {
  return useQuery({
    queryKey: businessKeys.sentDetail(organizationId, enquiryId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/business/enquiries/{enquiry_id}", {
          params: {
            header: organizationHeader(organizationId),
            path: { enquiry_id: pathId(enquiryId) },
          },
          signal,
        }),
      ),
  });
}

/** Enquiries about the selected organization's business offers: its leads. */
export function useReceivedEnquiries(organizationId: string, filters: EnquiryFilters, page: Page,
  { enabled = true } = {},
) {
  return useQuery({
    enabled,
    queryKey: businessKeys.receivedList(organizationId, filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/business/received-enquiries", {
          params: {
            header: organizationHeader(organizationId),
            query: enquiryQuery(filters, page),
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useReceivedEnquiry(organizationId: string, enquiryId: string) {
  return useQuery({
    queryKey: businessKeys.receivedDetail(organizationId, enquiryId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/business/received-enquiries/{enquiry_id}", {
          params: {
            header: organizationHeader(organizationId),
            path: { enquiry_id: pathId(enquiryId) },
          },
          signal,
        }),
      ),
  });
}
