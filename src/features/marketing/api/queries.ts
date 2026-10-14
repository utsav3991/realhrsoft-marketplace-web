import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { SortOrdering } from "@/design-system/components/data-table";
import {
  api,
  ApiError,
  nextOffset,
  PAGE_SIZE,
  pathId,
  unwrap,
  type Page,
  type Schemas,
} from "@/shared/api";

import { isSlotKey } from "./slot-key";

export type Campaign = Schemas["Campaign"];
export type Flight = Schemas["Flight"];
export type CampaignObjective = Schemas["CampaignObjectiveEnum"];
export type CampaignStatus = Schemas["MarketingOwnerStatusEnum"];
export type Advertisement = Schemas["Advertisement"];
export type AdRevision = Schemas["AdRevision"];
export type AdDecision = Schemas["AdDecision"];
export type AdDisplayStatus = Schemas["AdDisplayStatusEnum"];
export type CreativeType = Schemas["CreativeTypeEnum"];
export type DestinationType = Schemas["DestinationTypeEnum"];
export type CreativeAsset = Schemas["CreativeAsset"];
export type PlacementSlot = Schemas["PlacementSlot"];
export type PlacementSurface = Schemas["PlacementSurfaceEnum"];
export type AdvertisingGrant = Schemas["AdvertisingGrant"];
export type PortalAdvertisingGrant = Schemas["PortalAdvertisingGrant"];
export type GrantBasis = Schemas["AdvertisingGrantBasisEnum"];
export type Placement = Schemas["Placement"];
export type ServedAd = Schemas["ServedAd"];
export type AdPage = Schemas["AdPage"];
export type AdStats = Schemas["AdStats"];

/**
 * Who a marketing screen acts as. Administrators work across partners (global
 * `marketing.*` codes); the partner portal works for the selected organization
 * (`marketing.own_*` codes, sent with X-Organization-ID). Shared components take one of these
 * so the same form and record serve both.
 */
export type Workspace = { kind: "admin" } | PartnerWorkspace;
export interface PartnerWorkspace {
  kind: "partner";
  organizationId: string;
}

export const ADMIN_WORKSPACE: Workspace = { kind: "admin" };

export function partnerWorkspace(organizationId: string): PartnerWorkspace {
  return { kind: "partner", organizationId };
}

/** The workspace's base path for links to campaigns and advertisements. */
export function workspacePath(workspace: Workspace): "/admin" | "/partner" {
  return workspace.kind === "admin" ? "/admin" : "/partner";
}

const scopeKey = (workspace: Workspace) =>
  workspace.kind === "admin" ? "admin" : workspace.organizationId;

// The contract types the header as required; the API client sets it from the active
// organization, which is the selected one inside <RequireOrganization>.
export function header(workspace: PartnerWorkspace) {
  return { "X-Organization-ID": workspace.organizationId };
}

/** Advertisement columns the API sorts by (`ordering`). */
export const AD_SORTS = [
  "name",
  "submitted_at",
  "first_approved_at",
  "updated_at",
  "created_at",
] as const;
export type AdOrdering = SortOrdering<(typeof AD_SORTS)[number]>;
export const CAMPAIGN_SORTS = ["name", "starts_at", "updated_at", "created_at"] as const;
export type CampaignOrdering = SortOrdering<(typeof CAMPAIGN_SORTS)[number]>;
export const SLOT_SORTS = ["key", "name"] as const;
export type SlotOrdering = SortOrdering<(typeof SLOT_SORTS)[number]>;
export const GRANT_SORTS = ["valid_from", "valid_until"] as const;
export type GrantOrdering = SortOrdering<(typeof GRANT_SORTS)[number]>;

export interface AdFilters {
  search: string;
  status: AdDisplayStatus | null;
  /** The review queue: advertisements whose working revision awaits review. */
  inReview: boolean | null;
  campaignId: string | null;
  /** Administrators only. */
  partnerId: string | null;
  ordering: AdOrdering | null;
}

export interface CampaignFilters {
  search: string;
  status: CampaignStatus | null;
  objective: CampaignObjective | null;
  /** Administrators only. */
  partnerId: string | null;
  ordering: CampaignOrdering | null;
}

export interface SlotFilters {
  search: string;
  isActive: boolean | null;
  surface: PlacementSurface | null;
  ordering: SlotOrdering | null;
}

export interface GrantFilters {
  active: boolean | null;
  organizationId: string | null;
  ordering: GrantOrdering | null;
}

export const EMPTY_AD_FILTERS: AdFilters = {
  search: "",
  status: null,
  inReview: null,
  campaignId: null,
  partnerId: null,
  ordering: null,
};

export const EMPTY_CAMPAIGN_FILTERS: CampaignFilters = {
  search: "",
  status: null,
  objective: null,
  partnerId: null,
  ordering: null,
};

export const marketingKeys = {
  all: ["marketing"] as const,
  workspace: (workspace: Workspace) => [...marketingKeys.all, scopeKey(workspace)] as const,
  campaigns: (workspace: Workspace) =>
    [...marketingKeys.workspace(workspace), "campaigns"] as const,
  campaignList: (workspace: Workspace, filters: CampaignFilters, page: Page) =>
    [...marketingKeys.campaigns(workspace), "list", filters, page] as const,
  campaignOptions: (workspace: Workspace, partnerId: string | null, search: string) =>
    [...marketingKeys.campaigns(workspace), "options", partnerId, search] as const,
  campaign: (workspace: Workspace, id: string) =>
    [...marketingKeys.campaigns(workspace), "detail", id] as const,
  ads: (workspace: Workspace) => [...marketingKeys.workspace(workspace), "ads"] as const,
  adList: (workspace: Workspace, filters: AdFilters, page: Page) =>
    [...marketingKeys.ads(workspace), "list", filters, page] as const,
  ad: (workspace: Workspace, id: string) =>
    [...marketingKeys.ads(workspace), "detail", id] as const,
  adRevisions: (workspace: Workspace, id: string, page: Page) =>
    [...marketingKeys.ads(workspace), "revisions", id, page] as const,
  adDecisions: (workspace: Workspace, id: string, page: Page) =>
    [...marketingKeys.ads(workspace), "decisions", id, page] as const,
  assets: (workspace: Workspace) => [...marketingKeys.workspace(workspace), "assets"] as const,
  assetList: (workspace: Workspace, partnerId: string | null, search: string, page: Page) =>
    [...marketingKeys.assets(workspace), "list", partnerId, search, page] as const,
  asset: (workspace: Workspace, id: string) =>
    [...marketingKeys.assets(workspace), "detail", id] as const,
  // Assets are immutable, so their content is cached by id alone.
  assetContent: (workspace: Workspace, id: string) =>
    [...marketingKeys.assets(workspace), "content", id] as const,
  slots: (workspace: Workspace) => [...marketingKeys.workspace(workspace), "slots"] as const,
  slotList: (workspace: Workspace, filters: SlotFilters, page: Page) =>
    [...marketingKeys.slots(workspace), "list", filters, page] as const,
  targetableSlots: (workspace: Workspace) =>
    [...marketingKeys.slots(workspace), "targetable"] as const,
  adStats: (workspace: Workspace, id: string, dateFrom: string, dateTo: string) =>
    [...marketingKeys.ads(workspace), "stats", id, dateFrom, dateTo] as const,
  grants: (workspace: Workspace) => [...marketingKeys.workspace(workspace), "grants"] as const,
  grantList: (workspace: Workspace, filters: GrantFilters, page: Page) =>
    [...marketingKeys.grants(workspace), "list", filters, page] as const,
};

const ordering = <T extends string>(value: T | null) => (value ? [value] : undefined);

// --- Campaigns -------------------------------------------------------------------------

export function useCampaigns(workspace: Workspace, filters: CampaignFilters, page: Page) {
  return useQuery({
    queryKey: marketingKeys.campaignList(workspace, filters, page),
    queryFn: ({ signal }) => {
      const query = {
        search: filters.search || undefined,
        status: filters.status ?? undefined,
        objective: filters.objective ?? undefined,
        ordering: ordering(filters.ordering),
        offset: page.offset,
        limit: page.limit,
      };
      return unwrap(
        workspace.kind === "admin"
          ? api.GET("/admin/marketing/campaigns", {
              params: { query: { ...query, partner_id: filters.partnerId ?? undefined } },
              signal,
            })
          : api.GET("/partner/marketing/campaigns", {
              params: { header: header(workspace), query },
              signal,
            }),
      );
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Campaigns an advertisement can be filed under: not archived, matching the search, loading
 * every page. Administrators narrow to one partner.
 */
export function useCampaignOptions(workspace: Workspace, partnerId: string | null, search: string) {
  return useInfiniteQuery({
    queryKey: marketingKeys.campaignOptions(workspace, partnerId, search),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      const query = {
        search: search || undefined,
        ordering: ["name" as const],
        offset: pageParam,
        limit: PAGE_SIZE,
      };
      return unwrap(
        workspace.kind === "admin"
          ? api.GET("/admin/marketing/campaigns", {
              params: { query: { ...query, partner_id: partnerId ?? undefined } },
              signal,
            })
          : api.GET("/partner/marketing/campaigns", {
              params: { header: header(workspace), query },
              signal,
            }),
      );
    },
    getNextPageParam: nextOffset,
    select: (data) =>
      data.pages.flatMap((p) => p.results).filter((campaign) => campaign.status !== "archived"),
  });
}

export function useCampaign(workspace: Workspace, campaignId: string) {
  return useQuery({
    queryKey: marketingKeys.campaign(workspace, campaignId),
    queryFn: ({ signal }) => {
      const path = { campaign_id: pathId(campaignId) };
      return unwrap(
        workspace.kind === "admin"
          ? api.GET("/admin/marketing/campaigns/{campaign_id}", { params: { path }, signal })
          : api.GET("/partner/marketing/campaigns/{campaign_id}", {
              params: { header: header(workspace), path },
              signal,
            }),
      );
    },
  });
}

// --- Advertisements --------------------------------------------------------------------

export function useAds(workspace: Workspace, filters: AdFilters, page: Page) {
  return useQuery({
    queryKey: marketingKeys.adList(workspace, filters, page),
    queryFn: ({ signal }) => {
      const query = {
        search: filters.search || undefined,
        display_status: filters.status ?? undefined,
        in_review: filters.inReview ?? undefined,
        campaign_id: filters.campaignId ?? undefined,
        ordering: ordering(filters.ordering),
        offset: page.offset,
        limit: page.limit,
      };
      return unwrap(
        workspace.kind === "admin"
          ? api.GET("/admin/marketing/advertisements", {
              params: { query: { ...query, partner_id: filters.partnerId ?? undefined } },
              signal,
            })
          : api.GET("/partner/marketing/advertisements", {
              params: { header: header(workspace), query },
              signal,
            }),
      );
    },
    placeholderData: keepPreviousData,
  });
}

export function useAd(workspace: Workspace, adId: string) {
  return useQuery({
    queryKey: marketingKeys.ad(workspace, adId),
    queryFn: ({ signal }) => {
      const path = { ad_id: pathId(adId) };
      return unwrap(
        workspace.kind === "admin"
          ? api.GET("/admin/marketing/advertisements/{ad_id}", { params: { path }, signal })
          : api.GET("/partner/marketing/advertisements/{ad_id}", {
              params: { header: header(workspace), path },
              signal,
            }),
      );
    },
  });
}

/** Every revision, newest first. Frozen revisions never change. */
export function useAdRevisions(workspace: Workspace, adId: string, page: Page) {
  return useQuery({
    queryKey: marketingKeys.adRevisions(workspace, adId, page),
    queryFn: ({ signal }) => {
      const path = { ad_id: pathId(adId) };
      const query = { offset: page.offset, limit: page.limit };
      return unwrap(
        workspace.kind === "admin"
          ? api.GET("/admin/marketing/advertisements/{ad_id}/revisions", {
              params: { path, query },
              signal,
            })
          : api.GET("/partner/marketing/advertisements/{ad_id}/revisions", {
              params: { header: header(workspace), path, query },
              signal,
            }),
      );
    },
    placeholderData: keepPreviousData,
  });
}

/** Review decisions, suspensions and reinstatements, newest first, with their reasons. */
export function useAdDecisions(workspace: Workspace, adId: string, page: Page) {
  return useQuery({
    queryKey: marketingKeys.adDecisions(workspace, adId, page),
    queryFn: ({ signal }) => {
      const path = { ad_id: pathId(adId) };
      const query = { offset: page.offset, limit: page.limit };
      return unwrap(
        workspace.kind === "admin"
          ? api.GET("/admin/marketing/advertisements/{ad_id}/decisions", {
              params: { path, query },
              signal,
            })
          : api.GET("/partner/marketing/advertisements/{ad_id}/decisions", {
              params: { header: header(workspace), path, query },
              signal,
            }),
      );
    },
    placeholderData: keepPreviousData,
  });
}

// --- Creative assets -------------------------------------------------------------------

/** Uploaded images, newest first. Administrators list one partner's (`partnerId`). */
export function useAssets(
  workspace: Workspace,
  partnerId: string | null,
  search: string,
  page: Page,
  { enabled = true } = {},
) {
  return useQuery({
    queryKey: marketingKeys.assetList(workspace, partnerId, search, page),
    enabled,
    queryFn: ({ signal }) => {
      const query = { search: search || undefined, offset: page.offset, limit: page.limit };
      return unwrap(
        workspace.kind === "admin"
          ? api.GET("/admin/marketing/creative-assets", {
              params: { query: { ...query, partner_id: partnerId ?? undefined } },
              signal,
            })
          : api.GET("/partner/marketing/creative-assets", {
              params: { header: header(workspace), query },
              signal,
            }),
      );
    },
    placeholderData: keepPreviousData,
  });
}

/** One asset's details (size and type), for an image a revision names by id only. */
export function useAsset(workspace: Workspace, assetId: string | null) {
  return useQuery({
    queryKey: marketingKeys.asset(workspace, assetId ?? ""),
    enabled: assetId !== null,
    staleTime: Infinity,
    queryFn: ({ signal }) => {
      const path = { asset_id: pathId(assetId ?? "") };
      return unwrap(
        workspace.kind === "admin"
          ? api.GET("/admin/marketing/creative-assets/{asset_id}", { params: { path }, signal })
          : api.GET("/partner/marketing/creative-assets/{asset_id}", {
              params: { header: header(workspace), path },
              signal,
            }),
      );
    },
  });
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("The image could not be read"));
    reader.readAsDataURL(blob);
  });
}

/**
 * An asset's image as a data: URL. Assets are private: the content needs the bearer token, so
 * it is fetched through the API client rather than an <img src>. A data: URL needs no
 * revoking, and assets are immutable, so it is cached until unused for five minutes.
 */
export function useAssetImage(workspace: Workspace, assetId: string | null) {
  return useQuery({
    queryKey: marketingKeys.assetContent(workspace, assetId ?? ""),
    enabled: assetId !== null,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const path = { asset_id: pathId(assetId ?? "") };
      const blob = await unwrap(
        workspace.kind === "admin"
          ? api.GET("/admin/marketing/creative-assets/{asset_id}/content", {
              params: { path },
              parseAs: "blob",
              signal,
            })
          : api.GET("/partner/marketing/creative-assets/{asset_id}/content", {
              params: { header: header(workspace), path },
              parseAs: "blob",
              signal,
            }),
      );
      return readAsDataUrl(blob);
    },
  });
}

// --- Placement slots -------------------------------------------------------------------

/** The whole slot catalogue, inactive slots included (administrators). */
export function useSlots(filters: SlotFilters, page: Page) {
  return useQuery({
    queryKey: marketingKeys.slotList(ADMIN_WORKSPACE, filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/marketing/placement-slots", {
          params: {
            query: {
              search: filters.search || undefined,
              is_active: filters.isActive ?? undefined,
              surface: filters.surface ?? undefined,
              ordering: ordering(filters.ordering),
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

/** Every active slot an advertisement can target, loading every page. */
export function useTargetableSlots(workspace: Workspace, { enabled = true } = {}) {
  return useInfiniteQuery({
    queryKey: marketingKeys.targetableSlots(workspace),
    enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      const query = { offset: pageParam, limit: PAGE_SIZE };
      return unwrap(
        workspace.kind === "admin"
          ? api.GET("/admin/marketing/placement-slots", {
              params: { query: { ...query, is_active: true } },
              signal,
            })
          : api.GET("/partner/marketing/placement-slots", {
              params: { header: header(workspace), query },
              signal,
            }),
      );
    },
    getNextPageParam: nextOffset,
    select: (data) => data.pages.flatMap((p) => p.results),
  });
}

// --- Advertising grants ----------------------------------------------------------------

/** Every organization's grants and their history (administrators). */
export function useGrants(filters: GrantFilters, page: Page) {
  return useQuery({
    queryKey: marketingKeys.grantList(ADMIN_WORKSPACE, filters, page),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/admin/marketing/advertising-grants", {
          params: {
            query: {
              active: filters.active ?? undefined,
              organization_id: filters.organizationId ?? undefined,
              ordering: ordering(filters.ordering),
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

/** The selected organization's grants, narrowed to what a partner may see. */
export function useOwnGrants(organizationId: string, page: Page, { enabled = true } = {}) {
  const workspace = partnerWorkspace(organizationId);
  const filters: GrantFilters = { active: null, organizationId: null, ordering: "-valid_from" };
  return useQuery({
    queryKey: marketingKeys.grantList(workspace, filters, page),
    enabled,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/partner/marketing/advertising-grants", {
          params: {
            header: header(workspace),
            query: { ordering: ["-valid_from"], offset: page.offset, limit: page.limit },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

// --- Delivery reports --------------------------------------------------------------------

/** An advertisement's delivery counts for local days `dateFrom`..`dateTo` (YYYY-MM-DD). */
export function useAdStats(workspace: Workspace, adId: string, dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: marketingKeys.adStats(workspace, adId, dateFrom, dateTo),
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => {
      const path = { ad_id: pathId(adId) };
      const query = { date_from: dateFrom, date_to: dateTo };
      return unwrap(
        workspace.kind === "admin"
          ? api.GET("/admin/marketing/advertisements/{ad_id}/stats", {
              params: { path, query },
              signal,
            })
          : api.GET("/partner/marketing/advertisements/{ad_id}/stats", {
              params: { header: header(workspace), path, query },
              signal,
            }),
      );
    },
  });
}

// --- Placements (every signed-in user) -------------------------------------------------

function slotPathKey(slotKey: string): string {
  if (!isSlotKey(slotKey)) throw new TypeError("Invalid placement slot key");
  return slotKey;
}

export const placementKeys = {
  all: ["marketplace", "placements"] as const,
  slot: (slotKey: string) => [...placementKeys.all, slotKey] as const,
  image: (adId: string, revisionId: string, slotKey: string) =>
    [...placementKeys.all, "image", adId, revisionId, slotKey] as const,
  page: (adId: string, revisionId: string, slotKey: string) =>
    [...placementKeys.all, "page", adId, revisionId, slotKey] as const,
};

/**
 * The API's answer when a newer revision of a shown advertisement was approved: the image or
 * click would belong to other content, so the placement is reloaded instead.
 */
export const AD_CREATIVE_CHANGED = "AD_CREATIVE_CHANGED";

export function isCreativeChanged(error: unknown): boolean {
  return error instanceof ApiError && error.code === AD_CREATIVE_CHANGED;
}

/**
 * What to render in a slot for the signed-in user. Every read counts a served impression
 * (once per viewer and day), so the result is kept for the visit rather than refetched on
 * focus. Failures render nothing: a sponsored slot must never break the page around it.
 */
export function usePlacement(slotKey: string) {
  return useQuery({
    queryKey: placementKeys.slot(slotKey),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/marketplace/placements/{slot_key}", {
          params: { path: { slot_key: slotPathKey(slotKey) } },
          signal,
        }),
      ),
  });
}

/**
 * An advertisement's own page, opened from a click with the slot and revision it was served
 * as. The API rechecks every serving gate, so a paused or changed advertisement answers 404 or
 * 409 AD_CREATIVE_CHANGED rather than showing other content. Reading it counts nothing.
 */
export function useAdPage(adId: string, slotKey: string, revisionId: string) {
  return useQuery({
    queryKey: placementKeys.page(adId, revisionId, slotKey),
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET("/marketplace/advertisements/{ad_id}/page", {
          params: {
            path: { ad_id: pathId(adId) },
            query: { slot: slotPathKey(slotKey), revision: revisionId },
          },
          signal,
        }),
      ),
  });
}

/**
 * A served advertisement's private image as a data: URL (needs the bearer token). It is
 * requested and cached for the revision the placement returned, which never changes its
 * image; when a newer revision went live meanwhile, the placement is reloaded.
 */
export function useServedAdImage(
  ad: Pick<ServedAd, "id" | "revision_id" | "has_image">,
  slotKey: string,
) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: placementKeys.image(ad.id, ad.revision_id, slotKey),
    enabled: ad.has_image,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        const blob = await unwrap(
          api.GET("/marketplace/advertisements/{ad_id}/image", {
            params: {
              path: { ad_id: pathId(ad.id) },
              query: { slot: slotKey, revision: ad.revision_id },
            },
            parseAs: "blob",
            signal,
          }),
        );
        return readAsDataUrl(blob);
      } catch (error) {
        if (isCreativeChanged(error)) {
          void queryClient.invalidateQueries({ queryKey: placementKeys.slot(slotKey) });
        }
        throw error;
      }
    },
  });
}
