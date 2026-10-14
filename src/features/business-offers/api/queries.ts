import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import type { SortOrdering } from "@/design-system/components/data-table";
import {
  clientHeader,
  organizationHeader,
  type DisplayStatus,
} from "@/features/offers/api/queries";
import { api, nextOffset, PAGE_SIZE, pathId, unwrap, type Page, type Schemas } from "@/shared/api";

// Business (B2B) offers are `business_offer` offers: the Offer and OfferVersion shapes of the
// offer engine, with a version's business_policy (business audience, enquiry instructions and
// the employee switch). Businesses enquire about them; they never claim them.
export type BusinessAudience = Schemas["BusinessAudienceTypeEnum"];
/** A business in B2B: a merchant or a client group, as `{kind, id, name}`. */
export type BusinessRef = Schemas["BusinessRef"];

/**
 * The business acting in a portal: a merchant through its home organization (Business portal,
 * X-Organization-ID) or a client group (Client portal, X-Client-ID). The two portals call the
 * same endpoints under /business and /client/business.
 */
export type BusinessOwner = { kind: "organization"; id: string } | { kind: "client"; id: string };

const ownerKey = (owner: BusinessOwner) => `${owner.kind}:${owner.id}`;
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
  /** Administrators: only merchants' or only clients' offers. */
  providerKind: BusinessRef["kind"] | null;
  /** Administrators: one business's offers (a merchant or a client). */
  providerId: string | null;
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
  adminVersions: (id: string, page: Page) =>
    [...businessKeys.admin(), "versions", id, page] as const,
  adminDecisions: (id: string, page: Page) =>
    [...businessKeys.admin(), "decisions", id, page] as const,
  adminEnquiries: () => [...businessKeys.admin(), "enquiries"] as const,
  adminEnquiryList: (filters: EnquiryFilters, page: Page) =>
    [...businessKeys.adminEnquiries(), "list", filters, page] as const,
  adminEnquiry: (id: string) => [...businessKeys.adminEnquiries(), "detail", id] as const,
  // The acting business (Business portal or Client portal)
  owner: (owner: BusinessOwner) => [...businessKeys.all, ownerKey(owner)] as const,
  own: (owner: BusinessOwner) => [...businessKeys.owner(owner), "own"] as const,
  ownList: (owner: BusinessOwner, filters: BusinessOfferFilters, page: Page) =>
    [...businessKeys.own(owner), "list", filters, page] as const,
  ownDetail: (owner: BusinessOwner, id: string) =>
    [...businessKeys.own(owner), "detail", id] as const,
  ownVersions: (owner: BusinessOwner, id: string, page: Page) =>
    [...businessKeys.own(owner), "versions", id, page] as const,
  ownDecisions: (owner: BusinessOwner, id: string, page: Page) =>
    [...businessKeys.own(owner), "decisions", id, page] as const,
  ownCategories: (owner: BusinessOwner) =>
    [...businessKeys.owner(owner), "own-categories"] as const,
  directory: (owner: BusinessOwner, search: string) =>
    [...businessKeys.owner(owner), "directory", search] as const,
  catalogue: (owner: BusinessOwner) => [...businessKeys.owner(owner), "catalogue"] as const,
  catalogueList: (owner: BusinessOwner, filters: CatalogueFilters) =>
    [...businessKeys.catalogue(owner), "list", filters] as const,
  catalogueDetail: (owner: BusinessOwner, id: string) =>
    [...businessKeys.catalogue(owner), "detail", id] as const,
  catalogueCategories: (owner: BusinessOwner) =>
    [...businessKeys.catalogue(owner), "categories"] as const,
  sent: (owner: BusinessOwner) => [...businessKeys.owner(owner), "sent"] as const,
  sentList: (owner: BusinessOwner, filters: EnquiryFilters, page: Page) =>
    [...businessKeys.sent(owner), "list", filters, page] as const,
  sentDetail: (owner: BusinessOwner, id: string) =>
    [...businessKeys.sent(owner), "detail", id] as const,
  received: (owner: BusinessOwner) => [...businessKeys.owner(owner), "received"] as const,
  receivedList: (owner: BusinessOwner, filters: EnquiryFilters, page: Page) =>
    [...businessKeys.received(owner), "list", filters, page] as const,
  receivedDetail: (owner: BusinessOwner, id: string) =>
    [...businessKeys.received(owner), "detail", id] as const,
};

function offerQuery(filters: BusinessOfferFilters, page: Page) {
  return {
    search: filters.search || undefined,
    display_status: filters.status ?? undefined,
    in_review: filters.inReview ?? undefined,
    show_to_employees: filters.showToEmployees ?? undefined,
    provider_kind: filters.providerKind ?? undefined,
    provider_id: filters.providerId ?? undefined,
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

// --- Aayulogic administration ---------------------------------------------------------

/** Every business's business offers; the review queue is in_review=true. */
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

/** Every business's enquiries (offers.business_enquiry.view). */
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

// --- The acting business: own offers -------------------------------------------------
// Literal paths keep every call visible to the contract-coverage test.

export function useOwnBusinessOffers(
  owner: BusinessOwner,
  filters: BusinessOfferFilters,
  page: Page,
  { enabled = true } = {},
) {
  return useQuery({
    enabled,
    queryKey: businessKeys.ownList(owner, filters, page),
    queryFn: ({ signal }) => {
      const query = offerQuery(filters, page);
      return unwrap(
        owner.kind === "client"
          ? api.GET("/client/business/own-offers", {
              params: { header: clientHeader(owner.id), query },
              signal,
            })
          : api.GET("/business/own-offers", {
              params: { header: organizationHeader(owner.id), query },
              signal,
            }),
      );
    },
    placeholderData: keepPreviousData,
  });
}

export function useOwnBusinessOffer(owner: BusinessOwner, offerId: string) {
  return useQuery({
    queryKey: businessKeys.ownDetail(owner, offerId),
    queryFn: ({ signal }) => {
      const path = { offer_id: pathId(offerId) };
      return unwrap(
        owner.kind === "client"
          ? api.GET("/client/business/own-offers/{offer_id}", {
              params: { header: clientHeader(owner.id), path },
              signal,
            })
          : api.GET("/business/own-offers/{offer_id}", {
              params: { header: organizationHeader(owner.id), path },
              signal,
            }),
      );
    },
  });
}

export function useOwnBusinessOfferVersions(owner: BusinessOwner, offerId: string, page: Page) {
  return useQuery({
    queryKey: businessKeys.ownVersions(owner, offerId, page),
    queryFn: ({ signal }) => {
      const path = { offer_id: pathId(offerId) };
      const query = { offset: page.offset, limit: page.limit };
      return unwrap(
        owner.kind === "client"
          ? api.GET("/client/business/own-offers/{offer_id}/versions", {
              params: { header: clientHeader(owner.id), path, query },
              signal,
            })
          : api.GET("/business/own-offers/{offer_id}/versions", {
              params: { header: organizationHeader(owner.id), path, query },
              signal,
            }),
      );
    },
    placeholderData: keepPreviousData,
  });
}

export function useOwnBusinessOfferDecisions(owner: BusinessOwner, offerId: string, page: Page) {
  return useQuery({
    queryKey: businessKeys.ownDecisions(owner, offerId, page),
    queryFn: ({ signal }) => {
      const path = { offer_id: pathId(offerId) };
      const query = { offset: page.offset, limit: page.limit };
      return unwrap(
        owner.kind === "client"
          ? api.GET("/client/business/own-offers/{offer_id}/decisions", {
              params: { header: clientHeader(owner.id), path, query },
              signal,
            })
          : api.GET("/business/own-offers/{offer_id}/decisions", {
              params: { header: organizationHeader(owner.id), path, query },
              signal,
            }),
      );
    },
    placeholderData: keepPreviousData,
  });
}

/** Active categories the acting business may choose; not paginated. */
export function useOwnBusinessCategories(owner: BusinessOwner) {
  return useQuery({
    queryKey: businessKeys.ownCategories(owner),
    queryFn: ({ signal }) =>
      unwrap(
        owner.kind === "client"
          ? api.GET("/client/business/own-offer-categories", {
              params: { header: clientHeader(owner.id) },
              signal,
            })
          : api.GET("/business/own-offer-categories", {
              params: { header: organizationHeader(owner.id) },
              signal,
            }),
      ),
  });
}

/** Other businesses (kind and name only) to choose as an offer's audience; first page. */
export function useBusinessDirectory(owner: BusinessOwner, search: string) {
  return useQuery({
    queryKey: businessKeys.directory(owner, search),
    queryFn: ({ signal }) => {
      const query = { search: search || undefined, offset: 0, limit: PAGE_SIZE };
      return unwrap(
        owner.kind === "client"
          ? api.GET("/client/business/businesses", {
              params: { header: clientHeader(owner.id), query },
              signal,
            })
          : api.GET("/business/businesses", {
              params: { header: organizationHeader(owner.id), query },
              signal,
            }),
      );
    },
  });
}

// --- The acting business: catalogue -----------------------------------------------------

/** Other businesses' live business offers available to the acting one, newest first. */
export function useBusinessCatalogue(owner: BusinessOwner, filters: CatalogueFilters) {
  return useInfiniteQuery({
    queryKey: businessKeys.catalogueList(owner, filters),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      const query = {
        search: filters.search || undefined,
        category_id: filters.categoryId ?? undefined,
        offset: pageParam,
        limit: PAGE_SIZE,
      };
      return unwrap(
        owner.kind === "client"
          ? api.GET("/client/business/offers", {
              params: { header: clientHeader(owner.id), query },
              signal,
            })
          : api.GET("/business/offers", {
              params: { header: organizationHeader(owner.id), query },
              signal,
            }),
      );
    },
    getNextPageParam: nextOffset,
  });
}

export function useBusinessCatalogueOffer(owner: BusinessOwner, offerId: string) {
  return useQuery({
    queryKey: businessKeys.catalogueDetail(owner, offerId),
    queryFn: ({ signal }) => {
      const path = { offer_id: pathId(offerId) };
      return unwrap(
        owner.kind === "client"
          ? api.GET("/client/business/offers/{offer_id}", {
              params: { header: clientHeader(owner.id), path },
              signal,
            })
          : api.GET("/business/offers/{offer_id}", {
              params: { header: organizationHeader(owner.id), path },
              signal,
            }),
      );
    },
  });
}

/** Categories with at least one offer in the acting business's catalogue now. */
export function useBusinessCatalogueCategories(owner: BusinessOwner) {
  return useQuery({
    queryKey: businessKeys.catalogueCategories(owner),
    queryFn: ({ signal }) =>
      unwrap(
        owner.kind === "client"
          ? api.GET("/client/business/offer-categories", {
              params: { header: clientHeader(owner.id) },
              signal,
            })
          : api.GET("/business/offer-categories", {
              params: { header: organizationHeader(owner.id) },
              signal,
            }),
      ),
  });
}

// --- The acting business: enquiries -----------------------------------------------------

/** Enquiries the acting business sent, open or closed. */
export function useSentEnquiries(
  owner: BusinessOwner,
  filters: EnquiryFilters,
  page: Page,
  { enabled = true } = {},
) {
  return useQuery({
    enabled,
    queryKey: businessKeys.sentList(owner, filters, page),
    queryFn: ({ signal }) => {
      const query = enquiryQuery(filters, page);
      return unwrap(
        owner.kind === "client"
          ? api.GET("/client/business/enquiries", {
              params: { header: clientHeader(owner.id), query },
              signal,
            })
          : api.GET("/business/enquiries", {
              params: { header: organizationHeader(owner.id), query },
              signal,
            }),
      );
    },
    placeholderData: keepPreviousData,
  });
}

export function useSentEnquiry(owner: BusinessOwner, enquiryId: string) {
  return useQuery({
    queryKey: businessKeys.sentDetail(owner, enquiryId),
    queryFn: ({ signal }) => {
      const path = { enquiry_id: pathId(enquiryId) };
      return unwrap(
        owner.kind === "client"
          ? api.GET("/client/business/enquiries/{enquiry_id}", {
              params: { header: clientHeader(owner.id), path },
              signal,
            })
          : api.GET("/business/enquiries/{enquiry_id}", {
              params: { header: organizationHeader(owner.id), path },
              signal,
            }),
      );
    },
  });
}

/** Enquiries about the acting business's own offers: its leads. */
export function useReceivedEnquiries(
  owner: BusinessOwner,
  filters: EnquiryFilters,
  page: Page,
  { enabled = true } = {},
) {
  return useQuery({
    enabled,
    queryKey: businessKeys.receivedList(owner, filters, page),
    queryFn: ({ signal }) => {
      const query = enquiryQuery(filters, page);
      return unwrap(
        owner.kind === "client"
          ? api.GET("/client/business/received-enquiries", {
              params: { header: clientHeader(owner.id), query },
              signal,
            })
          : api.GET("/business/received-enquiries", {
              params: { header: organizationHeader(owner.id), query },
              signal,
            }),
      );
    },
    placeholderData: keepPreviousData,
  });
}

export function useReceivedEnquiry(owner: BusinessOwner, enquiryId: string) {
  return useQuery({
    queryKey: businessKeys.receivedDetail(owner, enquiryId),
    queryFn: ({ signal }) => {
      const path = { enquiry_id: pathId(enquiryId) };
      return unwrap(
        owner.kind === "client"
          ? api.GET("/client/business/received-enquiries/{enquiry_id}", {
              params: { header: clientHeader(owner.id), path },
              signal,
            })
          : api.GET("/business/received-enquiries/{enquiry_id}", {
              params: { header: organizationHeader(owner.id), path },
              signal,
            }),
      );
    },
  });
}
