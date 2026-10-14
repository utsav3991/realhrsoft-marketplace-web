import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeQueryClient, setActiveOrganizationId, type Schemas } from "@/shared/api";
import { SessionContext, type CurrentActor, type SessionValue } from "@/shared/auth";
import {
  OfferAdminPermission,
  PartnerOfferPermission,
  type PermissionCode,
} from "@/shared/authorization";

import { offerKeys } from "../api/queries";
import { EMPTY_BENEFIT_VALUE } from "../schemas/benefit-value";
import {
  EMPTY_OFFER,
  generatePromoCode,
  offerBody,
  offerSchema,
  type OfferValues,
} from "../schemas/offer";
import { OfferRecord } from "./offer-record";
import { OwnOffer } from "./own-offers";

// Tables keep their page and sort in the URL.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const OFFER_ID = "6a1c9d2e-4b7f-4e3a-8c5d-1f2e3a4b5c6d";
const LIVE_ID = "0d8a6c2e-1b3f-4a5d-9e7c-2f4b6d8a0c1e";
const WORKING_ID = "5e7c9a1b-3d5f-4b7a-8c9e-1a3c5e7a9b2d";
const ORG = "4a293c96-2952-43ac-bf39-bdfda7531c48";
const USER = "9d31c4aa-1f99-4c90-b748-e00893786136";

const category: Schemas["OfferCategory"] = {
  id: "2f6f4c1e-8a4b-4d51-9d4e-5f1c2b7a9e10",
  name: "Food & Dining",
  slug: "food-dining",
  description: "",
  sort_order: 10,
  is_active: true,
  version: 1,
  created_at: "2026-09-25T09:00:00Z",
  updated_at: "2026-09-25T09:00:00Z",
};

const policy: Schemas["MarketplacePolicy"] = {
  category: { id: category.id, name: category.name, slug: category.slug, is_active: true },
  audience_type: "all_eligible_users",
  audience_organizations: [],
  presentation_method: "promo_code",
  promo_code: "HRSOFT20",
  redemption_url: "",
  redemption_instructions: "",
  custom_method_name: "",
  acceptance_mode: "partner_approval_required",
  approval_ttl_hours: 72,
};

function version(
  id: string,
  number: number,
  state: Schemas["OfferVersionStateEnum"],
  headline = "20% off all drinks and pastries",
): Schemas["OfferVersion"] {
  return {
    id,
    number,
    state,
    title: "20% off at Himalayan Coffee House",
    headline,
    description: "Show the voucher at the counter.",
    terms: "One use per visit.",
    valid_from: "2026-10-01T00:00:00Z",
    valid_until: "2026-12-31T00:00:00Z",
    fulfillment_mode: "voucher_confirmation",
    benefit: { schema_version: 1, type: "percentage", description: "", percent: "20" },
    marketplace_policy: policy,
    benefit_policy: null,
    business_policy: null,
    edit_count: 1,
    frozen_at: state === "draft" ? null : "2026-09-25T10:00:00Z",
    frozen_by: null,
    submitted_at: state === "in_review" ? "2026-09-25T10:00:00Z" : null,
    submitted_by: null,
    created_by: USER,
    created_at: "2026-09-25T09:00:00Z",
    updated_at: "2026-09-25T10:00:00Z",
  };
}

const decision: Schemas["OfferDecision"] = {
  id: "c1f0e7a2-5d1b-4e0e-9a3f-2b6d7c8e9f01",
  version_id: WORKING_ID,
  version_number: 1,
  outcome: "changes_requested",
  via: "review",
  reason: "State which branches accept the code.",
  decided_by: "57a70ccd-174a-4501-ae31-712d32e778ca",
  decided_at: "2026-09-25T11:00:00Z",
};

/** Version 1 submitted, never published. */
const pending: Schemas["Offer"] = {
  id: OFFER_ID,
  kind: "marketplace_offer",
  provider_organization: { id: ORG, name: "Himalayan Coffee" },
  provider_client: null,
  business_provider: null,
  partner: {
    id: "0b0b5e3c-3c3f-4bd6-9a55-8f3b7f0a8f2e",
    organization_id: ORG,
    business_name: "Himalayan Coffee House",
    status: "verified",
    source: "partner_organization",
  },
  posted_via: "partner_portal",
  availability: "enabled",
  is_featured: false,
  version: 2,
  display_status: "in_review",
  visible_to_employees: false,
  visible_to_businesses: false,
  current_version: null,
  working_version: version(WORKING_ID, 1, "in_review"),
  first_published_at: null,
  suspended_at: null,
  suspended_by: null,
  suspension_reason: "",
  retired_at: null,
  retired_by: null,
  latest_decision: null,
  created_by: USER,
  updated_by: USER,
  created_at: "2026-09-25T10:00:00Z",
  updated_at: "2026-09-25T10:00:00Z",
};
const returned: Schemas["Offer"] = {
  ...pending,
  version: 3,
  display_status: "changes_requested",
  working_version: version(WORKING_ID, 1, "changes_requested"),
  latest_decision: decision,
};
const draft: Schemas["Offer"] = {
  ...pending,
  version: 4,
  display_status: "draft",
  working_version: version(WORKING_ID, 2, "draft"),
};
/** Version 1 live while version 2 is reviewed (D05). */
const replacing: Schemas["Offer"] = {
  ...pending,
  version: 6,
  display_status: "active",
  visible_to_employees: true,
  visible_to_businesses: false,
  current_version: version(LIVE_ID, 1, "approved", "15% off drinks"),
  working_version: version(WORKING_ID, 2, "in_review"),
  first_published_at: "2026-10-01T00:00:00Z",
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

function serve(offer: Schemas["Offer"]) {
  fetchMock.mockImplementation(async (request) => {
    const path = new URL(request.url).pathname;
    if (path.endsWith("/decisions")) return json(page([decision]));
    if (path.endsWith("/versions")) return json(page([offer.working_version]));
    if (path.includes("offer-categories")) return json(page([category]));
    if (request.method === "GET") return json(offer);
    return json({ ...offer, version: offer.version + 1 });
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

function renderAs(current: CurrentActor, ui: React.ReactNode, client = makeQueryClient()) {
  const session: SessionValue = {
    status: "authenticated",
    actor: current,
    error: null,
    login: async () => undefined,
    logout: async () => undefined,
  };
  return render(
    <QueryClientProvider client={client}>
      <SessionContext.Provider value={session}>{ui}</SessionContext.Provider>
    </QueryClientProvider>,
  );
}

function sent(method: string) {
  const call = fetchMock.mock.calls.find(([r]) => r.method === method);
  if (!call) throw new Error(`no ${method}`);
  return call[0];
}

const called = (method: string) => fetchMock.mock.calls.some(([r]) => r.method === method);

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  setActiveOrganizationId(null);
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("offer schema", () => {
  const valid: OfferValues = {
    ...EMPTY_OFFER,
    categoryId: category.id,
    title: "Title",
    headline: "Headline",
    benefit: { ...EMPTY_BENEFIT_VALUE, percent: "20" },
    description: "Description",
    validFrom: "2026-10-01T09:00",
    validUntil: "2026-12-31T09:00",
    promoCode: "HRSOFT20",
  };
  const messages = (values: OfferValues) =>
    offerSchema.safeParse(values).error?.issues.map((issue) => issue.path.join(".")) ?? [];

  it("requires the fields the presentation method uses", () => {
    expect(messages(valid)).toEqual([]);
    expect(messages({ ...valid, promoCode: "no spaces" })).toEqual(["promoCode"]);
    expect(messages({ ...valid, promoCode: "hrsoft20" })).toEqual(["promoCode"]);
    expect(messages({ ...valid, presentationMethod: "booking_link" })).toEqual(["redemptionUrl"]);
    expect(
      messages({ ...valid, presentationMethod: "booking_link", redemptionUrl: "http://x.test" }),
    ).toEqual(["redemptionUrl"]);
    expect(messages({ ...valid, presentationMethod: "custom" })).toEqual([
      "customMethodName",
      "redemptionInstructions",
    ]);
    expect(messages({ ...valid, presentationMethod: "in_store" })).toEqual([
      "redemptionInstructions",
    ]);
    expect(messages({ ...valid, presentationMethod: "show_employee_id" })).toEqual([]);
  });

  it("generates valid XXXX-XXXX promo codes without look-alike characters", () => {
    for (let i = 0; i < 50; i++) {
      const code = generatePromoCode();
      expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
      expect(messages({ ...valid, promoCode: code })).toEqual([]);
    }
  });

  it("validates the benefit value by its type", () => {
    const benefit = (patch: Partial<OfferValues["benefit"]>) =>
      messages({ ...valid, benefit: { ...valid.benefit, ...patch } });
    expect(benefit({ percent: "120" })).toEqual(["benefit.percent"]);
    expect(benefit({ percent: "12.345" })).toEqual(["benefit.percent"]);
    expect(benefit({ maxDiscountAmount: "500", currency: "Rs" })).toEqual(["benefit.currency"]);
    expect(benefit({ type: "fixed_amount" })).toEqual(["benefit.amount"]);
    expect(benefit({ type: "fixed_amount", amount: "200" })).toEqual([]);
    expect(benefit({ type: "free_item" })).toEqual(["benefit.item"]);
    expect(benefit({ type: "descriptive" })).toEqual(["benefit.description"]);
  });

  it("bounds the decision window only when the partner approves claims", () => {
    expect(messages({ ...valid, approvalTtlHours: "0" })).toEqual([]);
    const approval = { ...valid, acceptanceMode: "partner_approval_required" as const };
    expect(messages(approval)).toEqual([]);
    expect(messages({ ...approval, approvalTtlHours: "721" })).toEqual(["approvalTtlHours"]);
  });

  it("needs an end after the start and organizations for a selected audience", () => {
    expect(messages({ ...valid, validUntil: valid.validFrom })).toEqual(["validUntil"]);
    expect(messages({ ...valid, audienceType: "selected_organizations" })).toEqual([
      "audienceOrganizations",
    ]);
  });

  it("sends only the fields the method, value type, acceptance and audience use", () => {
    const body = offerBody({
      ...valid,
      presentationMethod: "booking_link",
      redemptionUrl: "https://book.test",
      audienceOrganizations: [{ id: ORG, name: "Org" }],
    });
    expect(body.promo_code).toBe("");
    expect(body.redemption_url).toBe("https://book.test");
    expect(body.audience_organization_ids).toEqual([]);
    expect(body.approval_ttl_hours).toBeNull();
    expect(body.benefit).toEqual({
      type: "percentage",
      description: "",
      percent: "20",
      currency: "",
      item: "",
    });
    expect(body.valid_from).toBe(new Date("2026-10-01T09:00").toISOString());
    const approval = offerBody({ ...valid, acceptanceMode: "partner_approval_required" });
    expect(approval.approval_ttl_hours).toBe(72);
  });
});

describe("<OfferRecord>", () => {
  it("offers each review action only with its own permission", async () => {
    serve(pending);
    renderAs(
      admin([OfferAdminPermission.OFFER_VIEW, OfferAdminPermission.OFFER_APPROVE]),
      <OfferRecord offerId={OFFER_ID} />,
    );
    expect(
      await screen.findByRole("heading", { name: pending.working_version!.title }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Approve" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Request changes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
    // A version under review is not editable, whatever the permissions: retract it first.
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByText("Decision history")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([r]) => r.url.endsWith("/decisions"))).toBe(false);
  });

  it("approves the working version it showed, at the loaded record version", async () => {
    serve(pending);
    const user = userEvent.setup();
    renderAs(
      admin([OfferAdminPermission.OFFER_VIEW, OfferAdminPermission.OFFER_APPROVE]),
      <OfferRecord offerId={OFFER_ID} />,
    );
    await user.click(await screen.findByRole("button", { name: "Approve" }));
    await user.click(screen.getByRole("button", { name: "Approve version" }));

    await waitFor(() => expect(called("POST")).toBe(true));
    const request = sent("POST");
    expect(new URL(request.url).pathname).toBe(`/api/v1/admin/offers/${OFFER_ID}/approve`);
    expect(await request.json()).toEqual({
      reason: "",
      expected_version: 2,
      version_id: WORKING_ID,
    });
  });

  it("requires a reason to request changes", async () => {
    serve(pending);
    const user = userEvent.setup();
    renderAs(
      admin([OfferAdminPermission.OFFER_VIEW, OfferAdminPermission.OFFER_REQUEST_CHANGES]),
      <OfferRecord offerId={OFFER_ID} />,
    );
    await user.click(await screen.findByRole("button", { name: "Request changes" }));
    await user.click(screen.getAllByRole("button", { name: "Request changes" }).at(-1)!);
    expect(await screen.findByText(/Give a reason/)).toBeVisible();
    expect(called("POST")).toBe(false);
  });

  it("keeps the live version visible while its replacement is reviewed", async () => {
    serve(replacing);
    renderAs(admin([OfferAdminPermission.OFFER_VIEW]), <OfferRecord offerId={OFFER_ID} />);
    expect(await screen.findByText("Pending changes · version 2")).toBeVisible();
    expect(screen.getByText("Live · version 1")).toBeVisible();
    expect(screen.getByText("15% off drinks")).toBeVisible();
    expect(screen.getByText(/The live version 1 stays live meanwhile/)).toBeVisible();
  });

  it("saves an edit against the version it started from, not a refetched one", async () => {
    serve(draft);
    const client = makeQueryClient();
    const user = userEvent.setup();
    renderAs(
      admin([
        OfferAdminPermission.OFFER_VIEW,
        OfferAdminPermission.OFFER_UPDATE,
        OfferAdminPermission.CATEGORY_VIEW,
      ]),
      <OfferRecord offerId={OFFER_ID} />,
      client,
    );
    await user.click(await screen.findByRole("button", { name: "Edit" }));
    await screen.findByLabelText("Title");
    await act(async () => {
      client.setQueryData(offerKeys.detail(OFFER_ID), { ...draft, version: 9 });
    });
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(called("PUT")).toBe(true));
    const body = await sent("PUT").json();
    expect(body.title).toBe(draft.working_version!.title);
    expect(body.expected_version).toBe(draft.version);
    expect(body.intent).toBe("save");
  });

  it("regenerates the promo code only before the offer is first published", async () => {
    const permissions = [
      OfferAdminPermission.OFFER_VIEW,
      OfferAdminPermission.OFFER_UPDATE,
      OfferAdminPermission.CATEGORY_VIEW,
    ];
    const user = userEvent.setup();
    serve(draft);
    const { unmount } = renderAs(admin(permissions), <OfferRecord offerId={OFFER_ID} />);
    await user.click(await screen.findByRole("button", { name: "Edit" }));
    const code = await screen.findByLabelText<HTMLInputElement>("Promo code");
    expect(code).toHaveValue("HRSOFT20");
    await user.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(code.value).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
    await user.clear(code);
    await user.type(code, "java-20");
    expect(code).toHaveValue("JAVA-20");
    unmount();

    serve({ ...draft, first_published_at: "2026-10-01T00:00:00Z" });
    renderAs(admin(permissions), <OfferRecord offerId={OFFER_ID} />);
    await user.click(await screen.findByRole("button", { name: "Edit" }));
    expect(await screen.findByLabelText("Promo code")).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeDisabled();
  });
});

describe("Partner portal offer", () => {
  it("shows reviewer feedback and gates edit, submit and history separately", async () => {
    serve(returned);
    setActiveOrganizationId(ORG);
    renderAs(
      member([PartnerOfferPermission.OFFER_VIEW, PartnerOfferPermission.OFFER_UPDATE]),
      <OwnOffer offerId={OFFER_ID} />,
    );
    expect(await screen.findByText(decision.reason)).toBeVisible();
    expect(screen.getByRole("button", { name: "Edit" })).toBeVisible();
    // A returned version is frozen: only an edit into a new draft can be submitted.
    expect(screen.queryByRole("button", { name: "Submit for review" })).not.toBeInTheDocument();
    expect(screen.queryByText("Decision history")).not.toBeInTheDocument();
    const [request] = fetchMock.mock.calls[0]!;
    expect(new URL(request.url).pathname).toBe(`/api/v1/partner/offers/${OFFER_ID}`);
    expect(request.headers.get("X-Organization-ID")).toBe(ORG);
  });

  it("submits a draft for review at the loaded version", async () => {
    serve(draft);
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(
      member([PartnerOfferPermission.OFFER_VIEW, PartnerOfferPermission.OFFER_SUBMIT]),
      <OwnOffer offerId={OFFER_ID} />,
    );
    await user.click(await screen.findByRole("button", { name: "Submit for review" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(called("POST")).toBe(true));
    const request = sent("POST");
    expect(new URL(request.url).pathname).toBe(`/api/v1/partner/offers/${OFFER_ID}/submit`);
    expect(await request.json()).toEqual({ expected_version: 4, reason: "" });
  });

  it("offers owner controls but never administrator decisions", async () => {
    serve(replacing);
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(member(Object.values(PartnerOfferPermission)), <OwnOffer offerId={OFFER_ID} />);
    await user.click(await screen.findByRole("button", { name: "More actions" }));
    const menu = await screen.findByRole("menu");
    for (const item of ["Retract from review", "Pause", "Unpublish", "Retire"]) {
      expect(within(menu).getByRole("menuitem", { name: item })).toBeVisible();
    }
    expect(within(menu).queryByRole("menuitem", { name: "Resume" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    // The replacement is under review, so nothing can be edited until it is retracted.
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });
});
