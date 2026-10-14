import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeQueryClient, setActiveOrganizationId, type Schemas } from "@/shared/api";
import { SessionContext, type CurrentActor, type SessionValue } from "@/shared/auth";
import {
  ClaimAdminPermission,
  PartnerClaimPermission,
  type PermissionCode,
} from "@/shared/authorization";

import { AdminClaim } from "./admin-claims";
import { Catalogue, CatalogueOffer } from "./catalogue";
import { MyClaim } from "./my-claims";
import { PartnerClaims } from "./partner-claims";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const ORG = "4a293c96-2952-43ac-bf39-bdfda7531c48";
const OFFER_ID = "6a1c9d2e-4b7f-4e3a-8c5d-1f2e3a4b5c6d";
const VERSION_ID = "5e7c9a1b-3d5f-4b7a-8c9e-1a3c5e7a9b2d";
const CLAIM_ID = "0e2f9a51-7c3d-4b8e-9f10-2a3b4c5d6e7f";
const KEY = /^[0-9a-f-]{36}$/;

const offer: Schemas["MarketplaceOffer"] = {
  id: OFFER_ID,
  version_id: VERSION_ID,
  version_number: 2,
  title: "20% off at Himalayan Coffee House",
  headline: "20% off all drinks",
  description: "Show the voucher at the counter.",
  terms: "One use per visit.",
  valid_from: "2026-09-01T00:00:00Z",
  valid_until: "2026-12-31T00:00:00Z",
  benefit: { schema_version: 1, type: "percentage", description: "", percent: "20" },
  partner: { id: "0b0b5e3c-3c3f-4bd6-9a55-8f3b7f0a8f2e", business_name: "Himalayan Coffee House" },
  category: { id: "2f6f4c1e-8a4b-4d51-9d4e-5f1c2b7a9e10", name: "Food & Dining", slug: "food" },
  presentation_method: "promo_code",
  custom_method_name: "",
  acceptance_mode: "auto_accept",
  approval_ttl_hours: null,
  is_featured: false,
  my_claim: null,
};
const approvalOffer: Schemas["MarketplaceOffer"] = {
  ...offer,
  acceptance_mode: "partner_approval_required",
  approval_ttl_hours: 72,
};

const voucher: Schemas["VoucherSummary"] = {
  id: "8c1e3a5b-7d9f-4b1a-8c3e-5a7b9c1d3e5f",
  status: "available",
  reference: "VX7K2MQ9",
  valid_from: "2026-09-01T00:00:00Z",
  valid_until: "2026-12-31T00:00:00Z",
  presentation: {
    method: "promo_code",
    promo_code: "HRSOFT20",
    redemption_url: "",
    redemption_instructions: "",
    custom_method_name: "",
  },
  used_at: null,
  redemption: null,
};

const requested: Schemas["OwnClaim"] = {
  id: CLAIM_ID,
  kind: "marketplace_offer",
  employer: { id: "4a293c96-2952-43ac-bf39-bdfda7531c48", name: "Acme Nepal" },
  offer_id: OFFER_ID,
  partner: offer.partner.business_name,
  version_id: VERSION_ID,
  version_number: 2,
  title: offer.title,
  headline: offer.headline,
  status: "requested",
  requested_at: "2026-09-25T10:00:00Z",
  decision_deadline: "2026-09-28T10:00:00Z",
  accepted_at: null,
  decision: null,
  voucher: null,
  benefit_usage: null,
};
const accepted: Schemas["OwnClaim"] = {
  ...requested,
  status: "accepted",
  decision_deadline: null,
  accepted_at: "2026-09-25T10:00:00Z",
  decision: {
    outcome: "accepted",
    source: "policy",
    reason: "",
    decided_at: "2026-09-25T10:00:00Z",
  },
  voucher,
};

// The partner's view never names the claimant or their employer.
const partnerClaim: Schemas["PartnerClaim"] = {
  id: requested.id,
  offer_id: requested.offer_id,
  version_id: requested.version_id,
  version_number: requested.version_number,
  title: requested.title,
  headline: requested.headline,
  status: requested.status,
  requested_at: requested.requested_at,
  decision_deadline: requested.decision_deadline,
  accepted_at: requested.accepted_at,
  decision: null,
  voucher: null,
};

const adminClaim: Schemas["Claim"] = {
  ...requested,
  beneficiary_id: "9d31c4aa-1f99-4c90-b748-e00893786136",
  beneficiary_email: "asha@employer.test",
  employer: { id: "57a70ccd-174a-4501-ae31-712d32e778ca", name: "Acme" },
};

const page = <T,>(results: T[]) => ({ count: results.length, next: null, previous: null, results });

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" },
  });
}

function problem(status: number, code: string, extra: Record<string, unknown> = {}) {
  return json({ type: "about:blank", title: code, status, code, detail: code, ...extra }, status);
}

function actor(overrides: Partial<CurrentActor> = {}): CurrentActor {
  return {
    id: "actor-1",
    actorType: "employee",
    authenticationSource: "local",
    roles: [],
    globalPermissions: new Set(),
    organization: null,
    memberships: [],
    client: null,
    clients: [],
    ...overrides,
  };
}

function member(permissions: PermissionCode[]): CurrentActor {
  return actor({
    actorType: "marketplace_staff",
    organization: { id: ORG, permissions: new Set(permissions) },
    memberships: [
      { organizationId: ORG, name: "Himalayan Coffee", employer: false, partner: true },
    ],
  });
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

const path = (request: Request) => new URL(request.url).pathname;
const posts = () => fetchMock.mock.calls.filter(([r]) => r.method === "POST").map(([r]) => r);

function posted() {
  const request = posts()[0];
  if (!request) throw new Error("no POST");
  return request;
}

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  setActiveOrganizationId(null);
  fetchMock.mockReset();
  push.mockReset();
  vi.unstubAllGlobals();
});

describe("Employee catalogue", () => {
  it("explains eligibility instead of a missing permission on 403", async () => {
    fetchMock.mockImplementation(async () => problem(403, "FORBIDDEN"));
    renderAs(actor({ actorType: "marketplace_staff" }), <Catalogue />);
    expect(await screen.findByText("Offers are for employees")).toBeVisible();
  });

  it("claims the version it showed with an Idempotency-Key and opens the claim", async () => {
    fetchMock.mockImplementation(async (request) =>
      request.method === "POST" ? json(accepted, 201) : json(offer),
    );
    const user = userEvent.setup();
    renderAs(actor(), <CatalogueOffer offerId={OFFER_ID} />);
    await user.click(await screen.findByRole("button", { name: "Claim offer" }));
    expect(screen.getByText(/You get a voucher straight away/)).toBeVisible();
    await user.click(screen.getAllByRole("button", { name: "Claim offer" }).at(-1)!);

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/marketplace/claims/${CLAIM_ID}`));
    const request = posted();
    expect(path(request)).toBe("/api/v1/marketplace/claims");
    expect(request.headers.get("Idempotency-Key")).toMatch(KEY);
    expect(request.headers.get("X-Organization-ID")).toBeNull();
    expect(await request.json()).toEqual({ offer_id: OFFER_ID, version_id: VERSION_ID });
  });

  it("explains partner approval before an employee requests the offer", async () => {
    fetchMock.mockImplementation(async (request) =>
      request.method === "POST" ? json(requested, 201) : json(approvalOffer),
    );
    const user = userEvent.setup();
    renderAs(actor(), <CatalogueOffer offerId={OFFER_ID} />);
    expect(await screen.findByText(/approves each request within 72 hours/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Request offer" }));
    expect(screen.getByText(/You get a voucher only if they accept it/)).toBeVisible();
    await user.click(screen.getAllByRole("button", { name: "Request offer" }).at(-1)!);
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/marketplace/claims/${CLAIM_ID}`));
  });

  it("links to an existing claim instead of offering another", async () => {
    fetchMock.mockResolvedValue(json({ ...offer, my_claim: { id: CLAIM_ID, status: "rejected" } }));
    renderAs(actor(), <CatalogueOffer offerId={OFFER_ID} />);
    expect(await screen.findByRole("link", { name: "View your claim" })).toHaveAttribute(
      "href",
      `/marketplace/claims/${CLAIM_ID}`,
    );
    expect(screen.getByText("Rejected")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Claim offer" })).not.toBeInTheDocument();
  });

  it("shows claim actions and claimed status on catalogue cards", async () => {
    const claimed = {
      ...offer,
      id: "7b2d0e3f-5c8a-4f4b-9d6e-2a3b4c5d6e7f",
      title: "Free pastry",
      my_claim: { id: CLAIM_ID, status: "accepted" as const },
    };
    fetchMock.mockImplementation(async (request) =>
      path(request).endsWith("/offer-categories") ? json([]) : json(page([offer, claimed])),
    );
    renderAs(actor(), <Catalogue />);
    expect(await screen.findByRole("button", { name: "Claim offer" })).toBeVisible();
    expect(screen.getByRole("link", { name: "View your voucher" })).toHaveAttribute(
      "href",
      `/marketplace/claims/${CLAIM_ID}`,
    );
    expect(screen.getByRole("link", { name: `View ${offer.title}` })).toHaveAttribute(
      "href",
      `/marketplace/offers/${OFFER_ID}`,
    );
  });

  it("opens the existing claim when the API answers ALREADY_CLAIMED", async () => {
    fetchMock.mockImplementation(async (request) =>
      request.method === "POST"
        ? problem(409, "ALREADY_CLAIMED", { claim_id: CLAIM_ID })
        : json(offer),
    );
    const user = userEvent.setup();
    renderAs(actor(), <CatalogueOffer offerId={OFFER_ID} />);
    await user.click(await screen.findByRole("button", { name: "Claim offer" }));
    await user.click(screen.getAllByRole("button", { name: "Claim offer" }).at(-1)!);
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/marketplace/claims/${CLAIM_ID}`));
  });

  it("asks to review the terms again when another version went live", async () => {
    fetchMock.mockImplementation(async (request) =>
      request.method === "POST" ? problem(409, "OFFER_VERSION_CHANGED") : json(offer),
    );
    const user = userEvent.setup();
    renderAs(actor(), <CatalogueOffer offerId={OFFER_ID} />);
    await user.click(await screen.findByRole("button", { name: "Claim offer" }));
    await user.click(screen.getAllByRole("button", { name: "Claim offer" }).at(-1)!);

    // The dialog closes and the offer is refetched for the employee to read again.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([r]) => r.method === "GET").length).toBeGreaterThan(1),
    );
    expect(push).not.toHaveBeenCalled();
    // A new attempt gets a new key: the old one named other terms.
    await user.click(screen.getByRole("button", { name: "Claim offer" }));
    await user.click(screen.getAllByRole("button", { name: "Claim offer" }).at(-1)!);
    await waitFor(() => expect(posts()).toHaveLength(2));
    const [first, second] = posts();
    expect(first!.headers.get("Idempotency-Key")).not.toBe(second!.headers.get("Idempotency-Key"));
  });
});

describe("My claims", () => {
  it("shows the voucher of an accepted claim with its reference and code", async () => {
    fetchMock.mockResolvedValue(json(accepted));
    renderAs(actor(), <MyClaim claimId={CLAIM_ID} />);
    expect(await screen.findByText(voucher.reference)).toBeVisible();
    expect(screen.getByText("HRSOFT20")).toBeVisible();
    expect(screen.getByText("Available")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Cancel request" })).not.toBeInTheDocument();
  });

  it("cancels a pending request with an Idempotency-Key", async () => {
    fetchMock.mockImplementation(async (request) =>
      request.method === "POST" ? json({ ...requested, status: "cancelled" }) : json(requested),
    );
    const user = userEvent.setup();
    renderAs(actor(), <MyClaim claimId={CLAIM_ID} />);
    expect(await screen.findByText("Awaiting the partner's approval")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancel request" }));
    await user.click(screen.getAllByRole("button", { name: "Cancel request" }).at(-1)!);

    await waitFor(() => expect(posts()).toHaveLength(1));
    const request = posted();
    expect(path(request)).toBe(`/api/v1/marketplace/claims/${CLAIM_ID}/cancel`);
    expect(request.headers.get("Idempotency-Key")).toMatch(KEY);
  });
});

describe("Partner decision queue", () => {
  function servePartner() {
    fetchMock.mockImplementation(async (request) =>
      request.method === "POST"
        ? json({ ...partnerClaim, status: "accepted", voucher })
        : json(page([partnerClaim])),
    );
  }

  it("lists pending requests without decisions for a member who may only view", async () => {
    servePartner();
    setActiveOrganizationId(ORG);
    renderAs(member([PartnerClaimPermission.CLAIM_VIEW]), <PartnerClaims />);
    expect(await screen.findByText("Awaiting your decision")).toBeVisible();
    expect((await screen.findAllByRole("link", { name: offer.title }))[0]).toHaveAttribute(
      "href",
      `/partner/claims/${CLAIM_ID}`,
    );
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    const queue = fetchMock.mock.calls
      .map(([r]) => new URL(r.url))
      .find((url) => url.searchParams.get("status") === "requested");
    expect(queue?.pathname).toBe("/api/v1/partner/offer-claims");
    expect(queue?.searchParams.get("ordering")).toBe("decision_deadline");
  });

  it("accepts with the organization, an Idempotency-Key and an optional note", async () => {
    servePartner();
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(
      member([PartnerClaimPermission.CLAIM_VIEW, PartnerClaimPermission.CLAIM_ACCEPT]),
      <PartnerClaims />,
    );
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Accept" }));
    await user.click(screen.getByRole("button", { name: "Accept claim" }));

    await waitFor(() => expect(posts()).toHaveLength(1));
    const request = posted();
    expect(path(request)).toBe(`/api/v1/partner/offer-claims/${CLAIM_ID}/accept`);
    expect(request.headers.get("X-Organization-ID")).toBe(ORG);
    expect(request.headers.get("Idempotency-Key")).toMatch(KEY);
    expect(await request.json()).toEqual({ reason: "" });
  });

  it("requires a reason to reject", async () => {
    servePartner();
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(
      member([PartnerClaimPermission.CLAIM_VIEW, PartnerClaimPermission.CLAIM_REJECT]),
      <PartnerClaims />,
    );
    await user.click(await screen.findByRole("button", { name: "Reject" }));
    await user.click(screen.getByRole("button", { name: "Reject claim" }));
    expect(await screen.findByText(/Give a reason/)).toBeVisible();
    expect(posts()).toHaveLength(0);
  });
});

describe("<AdminClaim>", () => {
  it("decides on a partner's behalf only with each permission", async () => {
    fetchMock.mockResolvedValue(json(adminClaim));
    renderAs(
      actor({ globalPermissions: new Set([ClaimAdminPermission.CLAIM_VIEW]) }),
      <AdminClaim claimId={CLAIM_ID} />,
    );
    expect(await screen.findByText("asha@employer.test")).toBeVisible();
    expect(screen.getByText("Acme")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Accept on behalf" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject on behalf" })).not.toBeInTheDocument();
  });

  it("requires a reason even to accept on a partner's behalf", async () => {
    fetchMock.mockResolvedValue(json(adminClaim));
    const user = userEvent.setup();
    renderAs(
      actor({ globalPermissions: new Set(Object.values(ClaimAdminPermission)) }),
      <AdminClaim claimId={CLAIM_ID} />,
    );
    await user.click(await screen.findByRole("button", { name: "Accept on behalf" }));
    await user.click(screen.getByRole("button", { name: "Accept claim" }));
    expect(await screen.findByText(/Give a reason/)).toBeVisible();
    expect(posts()).toHaveLength(0);
  });
});
