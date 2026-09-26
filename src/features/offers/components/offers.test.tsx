import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeQueryClient, setActiveOrganizationId, type Schemas } from "@/shared/api";
import { SessionContext, type CurrentActor, type SessionValue } from "@/shared/auth";
import {
  OfferAdminPermission,
  PartnerOfferPermission,
  type PermissionCode,
} from "@/shared/authorization";

import { EMPTY_OFFER, offerBody, offerSchema, type OfferValues } from "../schemas/offer";
import { OfferRecord } from "./offer-record";
import { OwnOffer } from "./own-offers";

// Tables keep their page and sort in the URL.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const OFFER_ID = "6a1c9d2e-4b7f-4e3a-8c5d-1f2e3a4b5c6d";
const ORG = "4a293c96-2952-43ac-bf39-bdfda7531c48";

const decision: Schemas["OfferDecision"] = {
  id: "c1f0e7a2-5d1b-4e0e-9a3f-2b6d7c8e9f01",
  outcome: "changes_requested",
  via: "review",
  offer_version: 2,
  offer_revision: 1,
  reason: "State which branches accept the code.",
  decided_by: "57a70ccd-174a-4501-ae31-712d32e778ca",
  decided_at: "2026-09-25T11:00:00Z",
};

const pending: Schemas["Offer"] = {
  id: OFFER_ID,
  partner: {
    id: "0b0b5e3c-3c3f-4bd6-9a55-8f3b7f0a8f2e",
    organization_id: ORG,
    business_name: "Himalayan Coffee House",
    status: "verified",
    source: "partner_organization",
  },
  category: {
    id: "2f6f4c1e-8a4b-4d51-9d4e-5f1c2b7a9e10",
    name: "Food & Dining",
    slug: "food-dining",
    description: "",
    sort_order: 10,
    is_active: true,
    version: 1,
    created_at: "2026-09-25T09:00:00Z",
    updated_at: "2026-09-25T09:00:00Z",
  },
  title: "20% off at Himalayan Coffee House",
  benefit: "20% off all drinks and pastries",
  description: "Show the code at the counter.",
  terms: "One use per visit.",
  valid_from: "2026-10-01T00:00:00Z",
  valid_until: "2026-12-31T00:00:00Z",
  redemption_method: "promo_code",
  redemption_code: "HRSOFT20",
  redemption_url: "",
  redemption_instructions: "",
  custom_method_name: "",
  audience_type: "all_eligible_users",
  audience_organizations: [],
  is_featured: false,
  status: "pending_review",
  display_status: "pending_review",
  visible_to_employees: false,
  version: 2,
  revision: 1,
  posted_via: "partner_portal",
  created_by: "9d31c4aa-1f99-4c90-b748-e00893786136",
  updated_by: "9d31c4aa-1f99-4c90-b748-e00893786136",
  submitted_at: "2026-09-25T10:00:00Z",
  submitted_by: "9d31c4aa-1f99-4c90-b748-e00893786136",
  approved_revision: null,
  approved_at: null,
  approved_by: null,
  first_published_at: null,
  suspended_at: null,
  suspended_by: null,
  latest_decision: null,
  created_at: "2026-09-25T10:00:00Z",
  updated_at: "2026-09-25T10:00:00Z",
};
const returned: Schemas["Offer"] = {
  ...pending,
  status: "changes_requested",
  display_status: "changes_requested",
  version: 3,
  latest_decision: decision,
};

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" },
  });
}

function serve(offer: Schemas["Offer"]) {
  fetchMock.mockImplementation(async (request) => {
    const path = new URL(request.url).pathname;
    if (path.endsWith("/decisions")) {
      return json({ count: 1, next: null, previous: null, results: [decision] });
    }
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

function renderAs(current: CurrentActor, ui: React.ReactNode) {
  const session: SessionValue = {
    status: "authenticated",
    actor: current,
    error: null,
    login: async () => undefined,
    logout: async () => undefined,
  };
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SessionContext.Provider value={session}>{ui}</SessionContext.Provider>
    </QueryClientProvider>,
  );
}

function posted() {
  const call = fetchMock.mock.calls.find(([r]) => r.method === "POST");
  if (!call) throw new Error("no POST");
  return call[0];
}

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  setActiveOrganizationId(null);
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("offer schema", () => {
  const valid: OfferValues = {
    ...EMPTY_OFFER,
    categoryId: pending.category.id,
    title: "Title",
    benefit: "Benefit",
    description: "Description",
    terms: "Terms",
    validFrom: "2026-10-01T09:00",
    validUntil: "2026-12-31T09:00",
    redemptionCode: "HRSOFT20",
  };
  const messages = (values: OfferValues) =>
    offerSchema.safeParse(values).error?.issues.map((issue) => issue.path.join(".")) ?? [];

  it("requires the fields the redemption method uses", () => {
    expect(messages(valid)).toEqual([]);
    expect(messages({ ...valid, redemptionCode: "no spaces" })).toEqual(["redemptionCode"]);
    expect(messages({ ...valid, redemptionMethod: "booking_link" })).toEqual(["redemptionUrl"]);
    expect(
      messages({ ...valid, redemptionMethod: "booking_link", redemptionUrl: "http://x.test" }),
    ).toEqual(["redemptionUrl"]);
    expect(messages({ ...valid, redemptionMethod: "custom" })).toEqual([
      "customMethodName",
      "redemptionInstructions",
    ]);
    expect(messages({ ...valid, redemptionMethod: "show_employee_id" })).toEqual([]);
  });

  it("needs an end after the start and organizations for a selected audience", () => {
    expect(messages({ ...valid, validUntil: valid.validFrom })).toEqual(["validUntil"]);
    expect(messages({ ...valid, audienceType: "selected_organizations" })).toEqual([
      "audienceOrganizations",
    ]);
  });

  it("sends fields the method does not use empty, and organizations only when selected", () => {
    const body = offerBody({
      ...valid,
      redemptionMethod: "booking_link",
      redemptionUrl: "https://book.test",
      audienceOrganizations: [{ id: ORG, name: "Org" }],
    });
    expect(body.redemption_code).toBe("");
    expect(body.redemption_url).toBe("https://book.test");
    expect(body.audience_organization_ids).toEqual([]);
    expect(body.valid_from).toBe(new Date("2026-10-01T09:00").toISOString());
  });
});

describe("<OfferRecord>", () => {
  it("offers each review action only with its own permission", async () => {
    serve(pending);
    renderAs(
      admin([OfferAdminPermission.OFFER_VIEW, OfferAdminPermission.OFFER_APPROVE]),
      <OfferRecord offerId={OFFER_ID} />,
    );
    expect(await screen.findByRole("heading", { name: pending.title })).toBeVisible();
    expect(screen.getByRole("button", { name: "Approve" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Request changes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
    // Pending review is not editable, whatever the permissions.
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByText("Decision history")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([r]) => r.url.endsWith("/decisions"))).toBe(false);
  });

  it("approves at the loaded version with an optional note", async () => {
    serve(pending);
    const user = userEvent.setup();
    renderAs(
      admin([OfferAdminPermission.OFFER_VIEW, OfferAdminPermission.OFFER_APPROVE]),
      <OfferRecord offerId={OFFER_ID} />,
    );
    await user.click(await screen.findByRole("button", { name: "Approve" }));
    await user.click(screen.getByRole("button", { name: "Approve offer" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([r]) => r.method === "POST")).toBe(true));
    const request = posted();
    expect(new URL(request.url).pathname).toBe(`/api/v1/admin/offers/${OFFER_ID}/approve`);
    expect(await request.json()).toEqual({ reason: "", expected_version: 2 });
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
    expect(fetchMock.mock.calls.some(([r]) => r.method === "POST")).toBe(false);
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
    expect(screen.queryByRole("button", { name: "Submit for review" })).not.toBeInTheDocument();
    expect(screen.queryByText("Decision history")).not.toBeInTheDocument();
    const [request] = fetchMock.mock.calls[0]!;
    expect(new URL(request.url).pathname).toBe(`/api/v1/partner/offers/${OFFER_ID}`);
    expect(request.headers.get("X-Organization-ID")).toBe(ORG);
  });

  it("submits for review at the loaded version", async () => {
    serve(returned);
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(
      member([PartnerOfferPermission.OFFER_VIEW, PartnerOfferPermission.OFFER_SUBMIT]),
      <OwnOffer offerId={OFFER_ID} />,
    );
    await user.click(await screen.findByRole("button", { name: "Submit for review" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([r]) => r.method === "POST")).toBe(true));
    const request = posted();
    expect(new URL(request.url).pathname).toBe(`/api/v1/partner/offers/${OFFER_ID}/submit`);
    expect(await request.json()).toEqual({ expected_version: 3, reason: "" });
  });

  it("never offers administrator decisions in the portal", async () => {
    serve(pending);
    setActiveOrganizationId(ORG);
    renderAs(member(Object.values(PartnerOfferPermission)), <OwnOffer offerId={OFFER_ID} />);
    expect(await screen.findByRole("button", { name: "Withdraw to draft" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });
});
