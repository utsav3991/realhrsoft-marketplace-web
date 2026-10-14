import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeQueryClient, setActiveOrganizationId, type Schemas } from "@/shared/api";
import { SessionContext, type CurrentActor, type SessionValue } from "@/shared/auth";
import {
  MarketingAdminPermission,
  PartnerMarketingPermission,
  type PermissionCode,
} from "@/shared/authorization";

import { adBody, adSchema, EMPTY_AD, slotMisfit, type AdValues } from "../schemas/advertisement";
import { campaignSchema, EMPTY_CAMPAIGN, type CampaignValues } from "../schemas/campaign";
import { grantState } from "../schemas/catalogue";
import { AdminAd, OwnAd } from "./advertisements";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const AD_ID = "6a1c9d2e-4b7f-4e3a-8c5d-1f2e3a4b5c6d";
const REVISION_ID = "5e7c9a1b-3d5f-4b7a-8c9e-1a3c5e7a9b2d";
const ASSET_ID = "0d8a6c2e-1b3f-4a5d-9e7c-2f4b6d8a0c1e";
const ORG = "4a293c96-2952-43ac-bf39-bdfda7531c48";

const slot: Schemas["SlotRef"] = {
  id: "2f6f4c1e-8a4b-4d51-9d4e-5f1c2b7a9e10",
  key: "marketplace.home.top",
  name: "Home top banner",
  surface: "marketplace_home",
  is_active: true,
};

function revision(state: Schemas["AdRevisionStateEnum"]): Schemas["AdRevision"] {
  return {
    id: REVISION_ID,
    number: 1,
    state,
    creative_type: "image_banner",
    creative: {
      schema_version: 1,
      asset_id: ASSET_ID,
      alt_text: "Iced latte",
      headline: "Dashain coffee week",
      cta_label: "",
    },
    destination_type: "external_url",
    destination: { schema_version: 1, url: "https://coffee.example" },
    slots: [slot],
    content_digest: "",
    edit_count: 1,
    frozen_at: state === "draft" ? null : "2026-09-29T10:00:00Z",
    submitted_at: state === "in_review" ? "2026-09-29T10:00:00Z" : null,
    created_at: "2026-09-29T09:00:00Z",
    updated_at: "2026-09-29T10:00:00Z",
  };
}

const inReview: Schemas["Advertisement"] = {
  id: AD_ID,
  campaign: { id: "9d31c4aa-1f99-4c90-b748-e00893786136", name: "Dashain", status: "active" },
  owner_organization: { id: ORG, name: "Himalayan Coffee" },
  name: "Home banner",
  display_status: "in_review",
  availability: "active",
  current_revision: null,
  working_revision: revision("in_review"),
  suspended: false,
  suspended_at: null,
  suspension_reason: "",
  first_approved_at: null,
  posted_via: "partner_portal",
  archived_at: null,
  version: 3,
  created_at: "2026-09-29T09:00:00Z",
  updated_at: "2026-09-29T10:00:00Z",
};
const draft: Schemas["Advertisement"] = {
  ...inReview,
  display_status: "draft",
  working_revision: revision("draft"),
};

const decision: Schemas["AdDecision"] = {
  id: "c1f0e7a2-5d1b-4e0e-9a3f-2b6d7c8e9f01",
  revision_id: REVISION_ID,
  revision_number: 1,
  outcome: "changes_requested",
  reason: "Use a sharper image.",
  decided_by: "57a70ccd-174a-4501-ae31-712d32e778ca",
  decided_at: "2026-09-29T11:00:00Z",
};

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" },
  });
}

const page = (results: unknown[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

function serve(ad: Schemas["Advertisement"]) {
  fetchMock.mockImplementation(async (request) => {
    const path = new URL(request.url).pathname;
    if (path.endsWith("/decisions")) return json(page([decision]));
    if (path.endsWith("/revisions")) return json(page([ad.working_revision]));
    if (path.endsWith("/content")) {
      return new Response(new Blob(["png"], { type: "image/png" }), {
        headers: { "Content-Type": "image/png" },
      });
    }
    if (request.method === "GET") return json(ad);
    return json({ ...ad, version: ad.version + 1 });
  });
}

function admin(permissions: PermissionCode[]): CurrentActor {
  return {
    id: "admin-1",
    actorType: "staff",
    authenticationSource: "local",
    roles: [],
    globalPermissions: new Set(permissions),
    organization: null,
    memberships: [],
    client: null,
    clients: [],
  };
}

function member(permissions: PermissionCode[]): CurrentActor {
  return {
    ...admin([]),
    organization: { id: ORG, permissions: new Set(permissions) },
    memberships: [
      { organizationId: ORG, name: "Himalayan Coffee", employer: false, partner: true },
    ],
  };
}

function wrapper(current: CurrentActor, client = makeQueryClient()) {
  const session: SessionValue = {
    status: "authenticated",
    actor: current,
    error: null,
    login: async () => undefined,
    logout: async () => undefined,
  };
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
      </QueryClientProvider>
    );
  };
}

function renderAs(current: CurrentActor, ui: ReactNode) {
  return render(ui, { wrapper: wrapper(current) });
}

function posted() {
  const call = fetchMock.mock.calls.find(([r]) => r.method !== "GET");
  if (!call) throw new Error("nothing was posted");
  return call[0];
}

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  setActiveOrganizationId(null);
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("advertisement schema", () => {
  const valid: AdValues = {
    ...EMPTY_AD,
    name: "Home banner",
    assetId: ASSET_ID,
    altText: "Iced latte",
    url: "https://coffee.example",
    slotKeys: [slot.key],
  };
  const paths = (values: AdValues) =>
    adSchema.safeParse(values).error?.issues.map((issue) => issue.path.join(".")) ?? [];

  it("requires the fields each creative and destination type uses", () => {
    expect(paths(valid)).toEqual([]);
    expect(paths({ ...valid, assetId: "", altText: "" })).toEqual(["assetId", "altText"]);
    expect(paths({ ...valid, creativeType: "text_card" })).toEqual(["headline"]);
    expect(paths({ ...valid, url: "http://coffee.example" })).toEqual(["url"]);
    expect(paths({ ...valid, url: "https://user:pw@coffee.example" })).toEqual(["url"]);
    expect(paths({ ...valid, destinationType: "offer" })).toEqual(["offerId"]);
    expect(paths({ ...valid, slotKeys: [] })).toEqual(["slotKeys"]);
  });

  it("sends only the fields of the chosen types", () => {
    const text = adBody({ ...valid, creativeType: "text_card", headline: "Hi", body: "More" });
    expect(text.creative).toEqual({ headline: "Hi", body: "More", cta_label: "" });
    expect(text.destination).toEqual({ url: "https://coffee.example" });
    const offer = adBody({ ...valid, destinationType: "offer", offerId: AD_ID });
    expect(offer.creative).toEqual({
      asset_id: ASSET_ID,
      alt_text: "Iced latte",
      headline: "",
      cta_label: "",
    });
    expect(offer.destination).toEqual({ offer_id: AD_ID });
  });

  it("explains why an image does not fit a slot, as the server checks it", () => {
    const home = { allowed_creative_types: ["image_banner"], width: 1200, height: 300 };
    expect(slotMisfit(home, "image_banner", { width: 2400, height: 600 })).toBeNull();
    expect(slotMisfit(home, "image_banner", { width: 2400, height: 1200 })).toMatch(/aspect/);
    expect(slotMisfit(home, "image_banner", { width: 800, height: 200 })).toMatch(/at least/);
    expect(slotMisfit(home, "text_card", null)).toMatch(/Does not accept/);
  });
});

describe("campaign schema", () => {
  const valid: CampaignValues = {
    ...EMPTY_CAMPAIGN,
    name: "Dashain",
    startsAt: "2026-10-01T00:00",
    endsAt: "2026-10-31T23:59",
  };
  const paths = (values: CampaignValues) =>
    campaignSchema.safeParse(values).error?.issues.map((issue) => issue.path.join(".")) ?? [];

  it("keeps flights inside the campaign window", () => {
    const flight = { name: "", startsAt: "2026-10-10T00:00", endsAt: "2026-10-17T00:00" };
    expect(paths({ ...valid, flights: [flight] })).toEqual([]);
    expect(paths({ ...valid, flights: [{ ...flight, startsAt: "2026-09-01T00:00" }] })).toEqual([
      "flights.0.startsAt",
    ]);
    expect(paths({ ...valid, flights: [{ ...flight, endsAt: "" }] })).toEqual(["flights.0.endsAt"]);
    expect(paths({ ...valid, endsAt: "2026-09-01T00:00" })).toEqual(["endsAt"]);
  });
});

describe("grant state", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  const grant = {
    active: false,
    revoked_at: null,
    valid_from: "2026-09-01T00:00:00Z",
    valid_until: "2026-09-30T00:00:00Z",
  };
  it("reads revoked first, then the window", () => {
    expect(grantState({ ...grant, revoked_at: "2026-09-15T00:00:00Z" }, now)).toBe("revoked");
    expect(grantState({ ...grant, active: true }, now)).toBe("active");
    expect(grantState({ ...grant, valid_from: "2026-11-01T00:00:00Z" }, now)).toBe("scheduled");
    expect(grantState(grant, now)).toBe("expired");
  });
});

describe("<AdminAd>", () => {
  it("offers review decisions only with the review permission", async () => {
    serve(inReview);
    renderAs(
      admin([MarketingAdminPermission.AD_VIEW, MarketingAdminPermission.AD_SUSPEND]),
      <AdminAd adId={AD_ID} />,
    );
    expect(await screen.findByRole("heading", { name: "Home banner" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suspend" })).toBeVisible();
    // A revision under review is frozen: no edit until it is retracted.
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("approves the revision it showed, at the loaded version", async () => {
    serve(inReview);
    const user = userEvent.setup();
    renderAs(
      admin([MarketingAdminPermission.AD_VIEW, MarketingAdminPermission.AD_REVIEW]),
      <AdminAd adId={AD_ID} />,
    );
    await user.click(await screen.findByRole("button", { name: "Approve" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Approve revision" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([r]) => r.method === "POST")).toBe(true));
    const request = posted();
    expect(new URL(request.url).pathname).toBe(
      `/api/v1/admin/marketing/advertisements/${AD_ID}/approve`,
    );
    expect(await request.json()).toEqual({
      expected_version: 3,
      reason: "",
      revision_id: REVISION_ID,
    });
  });
});

describe("advertisement page preview", () => {
  it("shows reviewers the page employees will open, with an inert button", async () => {
    const reviewed = revision("in_review");
    serve({
      ...inReview,
      working_revision: {
        ...reviewed,
        destination_type: "ad_page",
        destination: {
          schema_version: 1,
          title: "Coffee week at Himalayan Coffee",
          body: "20% off every iced drink.",
          url: "https://coffee.example",
          action_label: "Order now",
        },
      },
    });
    renderAs(admin([MarketingAdminPermission.AD_VIEW]), <AdminAd adId={AD_ID} />);
    const preview = await screen.findByRole("region", { name: "Employee view" });
    expect(
      within(preview).getByRole("heading", { level: 3, name: "Coffee week at Himalayan Coffee" }),
    ).toBeVisible();
    expect(within(preview).getByText("20% off every iced drink.")).toBeVisible();
    expect(within(preview).getByText("Order now")).toBeVisible();
    // The preview never navigates; the target is listed with the details.
    expect(within(preview).queryByRole("link")).toBeNull();
    expect(screen.getByRole("link", { name: "https://coffee.example" })).toBeVisible();
  });
});

describe("<OwnAd>", () => {
  it("submits a draft for review in the selected organization", async () => {
    serve(draft);
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(
      member([PartnerMarketingPermission.AD_VIEW, PartnerMarketingPermission.AD_SUBMIT]),
      <OwnAd adId={AD_ID} />,
    );
    await user.click(await screen.findByRole("button", { name: "Submit for review" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([r]) => r.method === "POST")).toBe(true));
    const request = posted();
    expect(new URL(request.url).pathname).toBe(
      `/api/v1/partner/marketing/advertisements/${AD_ID}/submit`,
    );
    expect(request.headers.get("X-Organization-ID")).toBe(ORG);
    expect(await request.json()).toEqual({ expected_version: 3, reason: "" });
    // Owner controls need the manage code; review decisions never show in the portal.
    expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("shows the reviewer's feedback on a returned revision", async () => {
    serve({
      ...inReview,
      display_status: "changes_requested",
      working_revision: revision("changes_requested"),
    });
    setActiveOrganizationId(ORG);
    renderAs(
      member([PartnerMarketingPermission.AD_VIEW, PartnerMarketingPermission.AD_MANAGE]),
      <OwnAd adId={AD_ID} />,
    );
    expect((await screen.findAllByText(decision.reason)).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Edit" })).toBeVisible();
  });
});
