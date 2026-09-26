import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import type { SortOrdering } from "@/design-system/components/data-table";
import { api, nextOffset, PAGE_SIZE, pathId, unwrap, type Page, type Schemas } from "@/shared/api";

export type Offer = Schemas["Offer"];
export type OfferDecision = Schemas["OfferDecision"];
export type OfferCategory = Schemas["OfferCategory"];
export type OfferStatus = Offer["status"];
export type RedemptionMethod = Offer["redemption_method"];
export type PostedVia = Offer["posted_via"];
export type PartnerSource = Offer["partner"]["source"];

/** Offer columns the API sorts by (`ordering`). */
export const OFFER_SORTS = ["title", "partner", "valid_from"] as const;
export type OfferOrdering = SortOrdering<(typeof OFFER_SORTS)[number]>;
/** A partner's own offers share one partner, so that column does not sort. */
export const OWN_OFFER_SORTS = ["title", "valid_from"] as const;
export const CATEGORY_SORTS = ["name", "slug", "sort_order"] as const;
export type CategoryOrdering = SortOrdering<(typeof CATEGORY_SORTS)[number]>;

export interface OfferFilters {
  search: string;
  status: OfferStatus | null;
  source: PartnerSource | null;
  postedVia: PostedVia | null;
  featured: boolean | null;
  partnerId: string | null;
  /** Offers whose audience includes this organization's employees. */
  organizationId: string | null;
  ordering: OfferOrdering | null;
}

export interface CategoryFilters {
  search: string;
  isActive: boolean | null;
  ordering: CategoryOrdering | null;
}

export const offerKeys = {
  all: ["offers"] as const,
  lists: () => [...offerKeys.all, "list"] as const,
  list: (filters: OfferFilters, page: Page) => [...offerKeys.lists(), filters, page] as const,
  detail: (id: string) => [...offerKeys.all, "detail", id] as const,
  decisions: (id: string) => [...offerKeys.all, "decisions", id] as const,
  decisionPage: (id: string, page: Page) => [...offerKeys.decisions(id), page] as const,
  categories: () => [...offerKeys.all, "categories"] as const,
  categoryList: (filters: CategoryFilters, page: Page) =>
    [...offerKeys.categories(), filters, page] as const,
  activeCategories: () => [...offerKeys.categories(), "active"] as const,
  // The selected partner organization's own offers (portal).
  own: (organizationId: string) => [...offerKeys.all, "own", organizationId] as const,
  ownList: (
    organizationId: string,
    status: OfferStatus | null,
    ordering: OfferOrdering | null,
    page: Page,
  ) => [...offerKeys.own(organizationId), "list", status, ordering, page] as const,
  ownDetail: (organizationId: string, id: string) =>
    [...offerKeys.own(organizationId), "detail", id] as const,
  ownDecisions: (organizationId: string, id: string, page: Page) =>
    [...offerKeys.own(organizationId), "decisions", id, page] as const,
  ownCategories: (organizationId: string) =>
    [...offerKeys.own(organizationId), "categories"] as const,
};

// --- Aayulogic administration ---------------------------------------------------------

/** Every partner's offers; the review queue is status=pending_review. */
export function useOffers(filters: OfferFilters, page: Page) {
  return useQuery({
    queryKey: offerKeys.list(filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/offers", {
          params: {
            query: {
              search: filters.search || undefined,
              status: filters.status ?? undefined,
              source: filters.source ?? undefined,
              posted_via: filters.postedVia ?? undefined,
              is_featured: filters.featured ?? undefined,
              partner_id: filters.partnerId ?? undefined,
              organization_id: filters.organizationId ?? undefined,
              ordering: filters.ordering ? [filters.ordering] : undefined,
              offset: page.offset,
              limit: page.limit,
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useOffer(offerId: string) {
  return useQuery({
    queryKey: offerKeys.detail(offerId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/offers/{offer_id}", {
          params: { path: { offer_id: pathId(offerId) } },
          signal,
        }),
      ),
  });
}

/** Every moderation decision on an offer, newest first. */
export function useOfferDecisions(offerId: string, page: Page) {
  return useQuery({
    queryKey: offerKeys.decisionPage(offerId, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/offers/{offer_id}/decisions", {
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

/** Every category, retired ones included. */
export function useCategories(filters: CategoryFilters, page: Page) {
  return useQuery({
    queryKey: offerKeys.categoryList(filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/offer-categories", {
          params: {
            query: {
              search: filters.search || undefined,
              is_active: filters.isActive ?? undefined,
              ordering: filters.ordering ? [filters.ordering] : undefined,
              offset: page.offset,
              limit: page.limit,
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

/** Every active category, loading every page: the choices of an administrator's offer form. */
export function useActiveCategories() {
  return useInfiniteQuery({
    queryKey: offerKeys.activeCategories(),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/admin/offer-categories", {
          params: { query: { is_active: true, offset: pageParam, limit: PAGE_SIZE } },
          signal,
        }),
      ),
    getNextPageParam: nextOffset,
  });
}

export function useCategory(categoryId: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...offerKeys.categories(), "detail", categoryId],
    enabled,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/offer-categories/{category_id}", {
          params: { path: { category_id: pathId(categoryId) } },
          signal,
        }),
      ),
  });
}

// --- Partner portal (the selected organization) ----------------------------------------

// The contract types the header as required; the API client sets it from the active
// organization, which is the selected one inside <RequireOrganization>.
export function organizationHeader(organizationId: string) {
  return { "X-Organization-ID": organizationId };
}

export function useOwnOffers(
  organizationId: string,
  status: OfferStatus | null,
  ordering: OfferOrdering | null,
  page: Page,
) {
  return useQuery({
    queryKey: offerKeys.ownList(organizationId, status, ordering, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/partner/offers", {
          params: {
            header: organizationHeader(organizationId),
            query: {
              status: status ?? undefined,
              ordering: ordering ? [ordering] : undefined,
              offset: page.offset,
              limit: page.limit,
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useOwnOffer(organizationId: string, offerId: string) {
  return useQuery({
    queryKey: offerKeys.ownDetail(organizationId, offerId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/partner/offers/{offer_id}", {
          params: {
            header: organizationHeader(organizationId),
            path: { offer_id: pathId(offerId) },
          },
          signal,
        }),
      ),
  });
}

export function useOwnOfferDecisions(organizationId: string, offerId: string, page: Page) {
  return useQuery({
    queryKey: offerKeys.ownDecisions(organizationId, offerId, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/partner/offers/{offer_id}/decisions", {
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

/** Active categories a partner may choose; not paginated. */
export function useOwnCategories(organizationId: string) {
  return useQuery({
    queryKey: offerKeys.ownCategories(organizationId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/partner/offer-categories", {
          params: { header: organizationHeader(organizationId) },
          signal,
        }),
      ),
  });
}

// --- Employee catalogue ----------------------------------------------------------------

export type MarketplaceOffer = Schemas["MarketplaceOffer"];
export type CatalogueCategory = Schemas["OfferCategoryOption"];

export interface CatalogueFilters {
  search: string;
  categoryId: string | null;
  featured: boolean | null;
}

// Eligibility, not a permission code, opens these: an employee account with a current
// employment. Anyone else gets 403. Responses never carry redemption details.
export const catalogueKeys = {
  all: ["catalogue"] as const,
  lists: () => [...catalogueKeys.all, "list"] as const,
  list: (filters: CatalogueFilters) => [...catalogueKeys.lists(), filters] as const,
  detail: (id: string) => [...catalogueKeys.all, "detail", id] as const,
  categories: () => [...catalogueKeys.all, "categories"] as const,
};

/** Offers the employee can claim now: featured first, then newest published. */
export function useCatalogue(filters: CatalogueFilters) {
  return useInfiniteQuery({
    queryKey: catalogueKeys.list(filters),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        api.GET("/marketplace/offers", {
          params: {
            query: {
              search: filters.search || undefined,
              category_id: filters.categoryId ?? undefined,
              is_featured: filters.featured ?? undefined,
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

export function useCatalogueOffer(offerId: string) {
  return useQuery({
    queryKey: catalogueKeys.detail(offerId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/marketplace/offers/{offer_id}", {
          params: { path: { offer_id: pathId(offerId) } },
          signal,
        }),
      ),
  });
}

/** Categories that have at least one offer the employee can see now; not paginated. */
export function useCatalogueCategories() {
  return useQuery({
    queryKey: catalogueKeys.categories(),
    queryFn: ({ signal }) => unwrap(api.GET("/marketplace/offer-categories", { signal })),
  });
}
