import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, pathId, unwrap, type Schemas } from "@/shared/api";

import {
  ADMIN_WORKSPACE,
  header,
  isCreativeChanged,
  marketingKeys,
  placementKeys,
  type ServedAd,
  type Workspace,
} from "./queries";

/**
 * Refetch the workspace's marketing data. Mutations run it on settle, failures included: a
 * 409 means the loaded version is stale.
 */
function useInvalidate(workspace: Workspace) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: marketingKeys.workspace(workspace) });
}

// --- Campaigns -------------------------------------------------------------------------

/** Administrators create for a verified partner (`partner_id`); the portal for itself. */
export type CampaignCreateBody = Schemas["CampaignInput"] & { partner_id?: string };

export function useCreateCampaign(workspace: Workspace) {
  return useMutation({
    mutationFn: ({ partner_id, ...body }: CampaignCreateBody) => {
      if (workspace.kind === "partner") {
        return unwrap(
          api.POST("/partner/marketing/campaigns", { params: { header: header(workspace) }, body }),
        );
      }
      if (!partner_id) throw new Error("An administrator creates a campaign for a partner");
      return unwrap(api.POST("/admin/marketing/campaigns", { body: { ...body, partner_id } }));
    },
    onSettled: useInvalidate(workspace),
  });
}

export function useUpdateCampaign(workspace: Workspace, campaignId: string) {
  return useMutation({
    mutationFn: (body: Schemas["CampaignUpdate"]) => {
      const path = { campaign_id: pathId(campaignId) };
      return unwrap(
        workspace.kind === "admin"
          ? api.PUT("/admin/marketing/campaigns/{campaign_id}", { params: { path }, body })
          : api.PUT("/partner/marketing/campaigns/{campaign_id}", {
              params: { header: header(workspace), path },
              body,
            }),
      );
    },
    onSettled: useInvalidate(workspace),
  });
}

export type CampaignAction = "pause" | "resume" | "archive";

/** Owner controls; only the partner portal has them. */
export function useCampaignAction(organizationId: string, campaignId: string) {
  const workspace: Workspace = { kind: "partner", organizationId };
  return useMutation({
    mutationFn: ({ action, ...body }: Schemas["ExpectedVersion"] & { action: CampaignAction }) => {
      const params = { header: header(workspace), path: { campaign_id: pathId(campaignId) } };
      switch (action) {
        case "pause":
          return unwrap(
            api.POST("/partner/marketing/campaigns/{campaign_id}/pause", { params, body }),
          );
        case "resume":
          return unwrap(
            api.POST("/partner/marketing/campaigns/{campaign_id}/resume", { params, body }),
          );
        case "archive":
          return unwrap(
            api.POST("/partner/marketing/campaigns/{campaign_id}/archive", { params, body }),
          );
      }
    },
    onSettled: useInvalidate(workspace),
  });
}

// --- Advertisements --------------------------------------------------------------------

export function useCreateAd(workspace: Workspace) {
  return useMutation({
    mutationFn: (body: Schemas["AdCreate"]) =>
      unwrap(
        workspace.kind === "admin"
          ? api.POST("/admin/marketing/advertisements", { body })
          : api.POST("/partner/marketing/advertisements", {
              params: { header: header(workspace) },
              body,
            }),
      ),
    onSettled: useInvalidate(workspace),
  });
}

export function useUpdateAd(workspace: Workspace, adId: string) {
  return useMutation({
    mutationFn: (body: Schemas["AdUpdate"]) => {
      const path = { ad_id: pathId(adId) };
      return unwrap(
        workspace.kind === "admin"
          ? api.PUT("/admin/marketing/advertisements/{ad_id}", { params: { path }, body })
          : api.PUT("/partner/marketing/advertisements/{ad_id}", {
              params: { header: header(workspace), path },
              body,
            }),
      );
    },
    onSettled: useInvalidate(workspace),
  });
}

/** Submit and retract exist in both workspaces; pause, resume and archive are the owner's. */
export type OwnerAdAction = "submit" | "retract" | "pause" | "resume" | "archive";

// Literal paths keep every call visible to the contract-coverage test.
function postOwnerAdAction(
  workspace: Workspace,
  action: OwnerAdAction,
  adId: string,
  body: Schemas["ExpectedVersion"],
) {
  const path = { ad_id: pathId(adId) };
  if (workspace.kind === "admin") {
    const params = { path };
    switch (action) {
      case "submit":
        return api.POST("/admin/marketing/advertisements/{ad_id}/submit", { params, body });
      case "retract":
        return api.POST("/admin/marketing/advertisements/{ad_id}/retract", { params, body });
      default:
        throw new Error(`Administrators cannot ${action} an advertisement`);
    }
  }
  const params = { header: header(workspace), path };
  switch (action) {
    case "submit":
      return api.POST("/partner/marketing/advertisements/{ad_id}/submit", { params, body });
    case "retract":
      return api.POST("/partner/marketing/advertisements/{ad_id}/retract", { params, body });
    case "pause":
      return api.POST("/partner/marketing/advertisements/{ad_id}/pause", { params, body });
    case "resume":
      return api.POST("/partner/marketing/advertisements/{ad_id}/resume", { params, body });
    case "archive":
      return api.POST("/partner/marketing/advertisements/{ad_id}/archive", { params, body });
  }
}

export function useOwnerAdAction(workspace: Workspace, adId: string) {
  return useMutation({
    mutationFn: ({ action, ...body }: Schemas["ExpectedVersion"] & { action: OwnerAdAction }) =>
      unwrap(postOwnerAdAction(workspace, action, adId, body)),
    onSettled: useInvalidate(workspace),
  });
}

/** Review decisions name the revision the reviewer read; moderation acts on the record. */
export type ReviewAction = "approve" | "reject" | "request-changes" | "suspend" | "reinstate";

export interface ReviewActionBody {
  expected_version: number;
  reason: string;
  /** Required by approve, reject and request-changes: the revision under review shown. */
  revision_id?: string;
}

function revisionBody({ revision_id, ...body }: ReviewActionBody) {
  if (!revision_id) throw new Error("A review decision needs the reviewed revision_id");
  return { ...body, revision_id };
}

function postReviewAction(action: ReviewAction, adId: string, body: ReviewActionBody) {
  const params = { path: { ad_id: pathId(adId) } };
  const { expected_version, reason } = body;
  switch (action) {
    case "approve":
      return api.POST("/admin/marketing/advertisements/{ad_id}/approve", {
        params,
        body: revisionBody(body),
      });
    case "reject":
      return api.POST("/admin/marketing/advertisements/{ad_id}/reject", {
        params,
        body: revisionBody(body),
      });
    case "request-changes":
      return api.POST("/admin/marketing/advertisements/{ad_id}/request-changes", {
        params,
        body: revisionBody(body),
      });
    case "suspend":
      return api.POST("/admin/marketing/advertisements/{ad_id}/suspend", {
        params,
        body: { expected_version, reason },
      });
    case "reinstate":
      return api.POST("/admin/marketing/advertisements/{ad_id}/reinstate", {
        params,
        body: { expected_version, reason },
      });
  }
}

export function useReviewAction(adId: string) {
  return useMutation({
    mutationFn: ({ action, ...body }: ReviewActionBody & { action: ReviewAction }) =>
      unwrap(postReviewAction(action, adId, body)),
    onSettled: useInvalidate(ADMIN_WORKSPACE),
  });
}

// --- Creative assets -------------------------------------------------------------------

/**
 * Uploads one image as multipart/form-data. The contract types `file` as a string (a DRF
 * FileField); the client passes FormData through untouched and lets the browser set the
 * boundary. Administrators upload for a verified partner.
 */
export async function uploadAsset(
  workspace: Workspace,
  { file, partnerId }: { file: File; partnerId?: string },
) {
  const form = new FormData();
  form.append("file", file);
  if (workspace.kind === "partner") {
    return unwrap(
      api.POST("/partner/marketing/creative-assets", {
        params: { header: header(workspace) },
        body: form as unknown as Schemas["AssetUpload"],
      }),
    );
  }
  if (!partnerId) throw new Error("An administrator uploads for a partner");
  form.append("partner_id", partnerId);
  return unwrap(
    api.POST("/admin/marketing/creative-assets", {
      body: form as unknown as Schemas["AdminAssetUpload"],
    }),
  );
}

export function useUploadAsset(workspace: Workspace) {
  return useMutation({
    mutationFn: (upload: { file: File; partnerId?: string }) => uploadAsset(workspace, upload),
    onSettled: useInvalidate(workspace),
  });
}

// --- Placement slots (administrators) --------------------------------------------------

export function useCreateSlot() {
  return useMutation({
    mutationFn: (body: Schemas["SlotInput"]) =>
      unwrap(api.POST("/admin/marketing/placement-slots", { body })),
    onSettled: useInvalidate(ADMIN_WORKSPACE),
  });
}

export function useUpdateSlot(slotId: string) {
  return useMutation({
    mutationFn: (body: Schemas["SlotUpdate"]) =>
      unwrap(
        api.PUT("/admin/marketing/placement-slots/{slot_id}", {
          params: { path: { slot_id: pathId(slotId) } },
          body,
        }),
      ),
    onSettled: useInvalidate(ADMIN_WORKSPACE),
  });
}

export function useSlotState(slotId: string) {
  return useMutation({
    mutationFn: ({ active, ...body }: Schemas["ExpectedVersionReason"] & { active: boolean }) => {
      const params = { path: { slot_id: pathId(slotId) } };
      return unwrap(
        active
          ? api.POST("/admin/marketing/placement-slots/{slot_id}/reactivate", { params, body })
          : api.POST("/admin/marketing/placement-slots/{slot_id}/deactivate", { params, body }),
      );
    },
    onSettled: useInvalidate(ADMIN_WORKSPACE),
  });
}

// --- Advertising grants (administrators) -----------------------------------------------

export function useCreateGrant() {
  return useMutation({
    mutationFn: (body: Schemas["GrantInput"]) =>
      unwrap(api.POST("/admin/marketing/advertising-grants", { body })),
    onSettled: useInvalidate(ADMIN_WORKSPACE),
  });
}

export function useRevokeGrant(grantId: string) {
  return useMutation({
    mutationFn: (body: Schemas["RevokeGrant"]) =>
      unwrap(
        api.POST("/admin/marketing/advertising-grants/{grant_id}/revoke", {
          params: { path: { grant_id: pathId(grantId) } },
          body,
        }),
      ),
    onSettled: useInvalidate(ADMIN_WORKSPACE),
  });
}

// --- Placements (every signed-in user) -------------------------------------------------

/**
 * Tell the API a served advertisement's creative is on screen, as the revision shown. Fire
 * and forget: it counts once per viewer and day, and a lost beacon only undercounts.
 */
export function reportRendered(ad: Pick<ServedAd, "id" | "revision_id">, slotKey: string): void {
  const beacon = api.POST("/marketplace/advertisements/{ad_id}/rendered", {
    params: { path: { ad_id: pathId(ad.id) } },
    body: { slot: slotKey, revision: ad.revision_id },
  });
  beacon.catch(() => undefined);
}

/**
 * Count a click on the revision shown and get its reviewed link to follow. 404 when the ad
 * is no longer available; AD_CREATIVE_CHANGED when a newer revision went live, which
 * reloads the placement so the viewer sees the new content before following it.
 */
export function useFollowAd(slotKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ad: ServedAd) =>
      unwrap(
        api.POST("/marketplace/advertisements/{ad_id}/click", {
          params: { path: { ad_id: pathId(ad.id) } },
          body: { slot: slotKey, revision: ad.revision_id },
        }),
      ),
    onError: (error) => {
      if (isCreativeChanged(error)) {
        void queryClient.invalidateQueries({ queryKey: placementKeys.slot(slotKey) });
      }
    },
  });
}
