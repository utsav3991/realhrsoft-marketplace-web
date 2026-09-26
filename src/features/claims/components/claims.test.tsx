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
import { RedemptionDetails } from "./claim-details";
import { PartnerClaims } from "./partner-claims";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const ORG = "4a293c96-2952-43ac-bf39-bdfda7531c48";
const OFFER_ID = "6a1c9d2e-4b7f-4e3a-8c5d-1f2e3a4b5c6d";
const CLAIM_ID = "0e2f9a51-7c3d-4b8e-9f10-2a3b4c5d6e7f";
const REFERENCE = "7KX2MQ9RTP";

const offer: Schemas["MarketplaceOffer"] = {
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
  benefit: "20% off all drinks",
  description: "Show the code at the counter.",
  terms: "One use per visit.",
  valid_from: "2026-09-01T00:00:00Z",
  valid_until: "2026-12-31T00:00:00Z",
  redemption_method: "promo_code",
  custom_method_name: "",
  is_featured: false,
  my_claim: null,
};

const partnerClaim: Schemas["PartnerClaim"] = {
  reference: REFERENCE,
  status: "active",
  offer_id: OFFER_ID,
  offer_revision: 1,
  title: offer.title,
  benefit: offer.benefit,
  redemption_method: "promo_code",
  claimed_at: "2026-09-25T10:00:00Z",
  expires_at: "2026-12-31T00:00:00Z",
  used_at: null,
};

const employeeClaim: Schemas["EmployeeClaim"] = {
  id: CLAIM_ID,
  reference: REFERENCE,
  status: "active",
  offer_id: OFFER_ID,
  partner_name: offer.partner.business_name,
  title: offer.title,
  benefit: offer.benefit,
  terms: offer.terms,
  redemption_method: "promo_code",
  redemption_code: "HRSOFT20",
  redemption_url: "",
  redemption_instructions: "",
  custom_method_name: "",
  claimed_at: "2026-09-25T10:00:00Z",
  expires_at: "2026-12-31T00:00:00Z",
  used_at: null,
};

const adminClaim: Schemas["Claim"] = {
  ...employeeClaim,
  offer_revision: 1,
  employee_id: "9d31c4aa-1f99-4c90-b748-e00893786136",
  employee_email: "asha@employer.test",
  organization_id: "57a70ccd-174a-4501-ae31-712d32e778ca",
  redemption: null,
};

const page = <T,>(results: T[]) => ({ count: results.length, next: null, previous: null, results });

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" },
  });
}

function problem(status: number, code: string) {
  return json({ type: "about:blank", title: code, status, code, detail: code }, status);
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
    ...overrides,
  };
}

function member(permissions: PermissionCode[]): CurrentActor {
  return actor({
    actorType: "marketplace_staff",
    organization: { id: ORG, permissions: new Set(permissions) },
    memberships: [{ organizationId: ORG, name: "Himalayan Coffee", employer: false, partner: true }],
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

function posted() {
  const call = fetchMock.mock.calls.find(([r]) => r.method === "POST");
  if (!call) throw new Error("no POST");
  return call[0];
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
    fetchMock.mockResolvedValue(problem(403, "FORBIDDEN"));
    renderAs(actor({ actorType: "marketplace_staff" }), <Catalogue />);
    expect(await screen.findByText("Offers are for employees")).toBeVisible();
  });

  it("claims with an Idempotency-Key and opens the claim", async () => {
    fetchMock.mockImplementation(async (request) => {
      if (request.method === "POST") return json(employeeClaim, 201);
      if (path(request).endsWith("/marketplace/claims")) return json(page([]));
      return json(offer);
    });
    const user = userEvent.setup();
    renderAs(actor(), <CatalogueOffer offerId={OFFER_ID} />);
    await user.click(await screen.findByRole("button", { name: "Claim offer" }));
    await user.click(screen.getAllByRole("button", { name: "Claim offer" }).at(-1)!);

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/marketplace/claims/${CLAIM_ID}`));
    const request = posted();
    expect(path(request)).toBe("/api/v1/marketplace/claims");
    expect(request.headers.get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/);
    expect(request.headers.get("X-Organization-ID")).toBeNull();
    expect(await request.json()).toEqual({ offer_id: OFFER_ID });
  });

  it("links to an existing claim instead of offering another", async () => {
    fetchMock.mockResolvedValue(json({ ...offer, my_claim: { id: CLAIM_ID, status: "used" } }));
    renderAs(actor(), <CatalogueOffer offerId={OFFER_ID} />);
    expect(await screen.findByRole("link", { name: "View your claim" })).toHaveAttribute(
      "href",
      `/marketplace/claims/${CLAIM_ID}`,
    );
    expect(screen.getByText("Used")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Claim offer" })).not.toBeInTheDocument();
  });

  it("shows claim actions and claimed status on catalogue cards", async () => {
    const claimed = {
      ...offer,
      id: "7b2d0e3f-5c8a-4f4b-9d6e-2a3b4c5d6e7f",
      title: "Free pastry",
      my_claim: { id: CLAIM_ID, status: "active" as const },
    };
    fetchMock.mockImplementation(async (request) =>
      path(request).endsWith("/offer-categories") ? json([]) : json(page([offer, claimed])),
    );
    renderAs(actor(), <Catalogue />);
    expect(await screen.findByRole("button", { name: "Claim offer" })).toBeVisible();
    expect(screen.getByRole("link", { name: "View your claim" })).toHaveAttribute(
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
        ? json(
            {
              type: "about:blank",
              title: "Conflict",
              status: 409,
              code: "ALREADY_CLAIMED",
              claim_id: CLAIM_ID,
            },
            409,
          )
        : json(offer),
    );
    const user = userEvent.setup();
    renderAs(actor(), <CatalogueOffer offerId={OFFER_ID} />);
    await user.click(await screen.findByRole("button", { name: "Claim offer" }));
    await user.click(screen.getAllByRole("button", { name: "Claim offer" }).at(-1)!);
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/marketplace/claims/${CLAIM_ID}`));
  });
});

describe("Redemption details", () => {
  const qrClaim = { ...employeeClaim, redemption_method: "qr_code" as const };

  it("draws a scannable QR code for a redeemable claim", () => {
    render(
      <dl>
        <RedemptionDetails claim={qrClaim} scannable />
      </dl>,
    );
    const code = screen.getByRole("img", { name: "QR code to show the partner" });
    expect(code.querySelector("path")?.getAttribute("d")).toMatch(/^M\d/);
    expect(screen.getByText("HRSOFT20")).toBeVisible();
  });

  it("shows only the value when the claim can no longer be redeemed", () => {
    render(
      <dl>
        <RedemptionDetails claim={qrClaim} />
      </dl>,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("HRSOFT20")).toBeVisible();
  });
});

describe("Partner claim verification", () => {
  it("looks up but does not confirm without the confirm permission", async () => {
    fetchMock.mockImplementation(async (request) =>
      path(request).endsWith("/partner/claims") ? json(page([partnerClaim])) : json(partnerClaim),
    );
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(member([PartnerClaimPermission.CLAIM_VIEW]), <PartnerClaims />);
    await user.type(screen.getByLabelText("Reference"), "7kx2-mq9rtp");
    await user.click(screen.getByRole("button", { name: "Look up" }));

    expect(await screen.findByText("Active: can be confirmed")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Confirm redemption" })).not.toBeInTheDocument();
    const lookup = fetchMock.mock.calls.find(([r]) => path(r).endsWith(REFERENCE))![0];
    expect(path(lookup)).toBe(`/api/v1/partner/claims/${REFERENCE}`);
    expect(lookup.headers.get("X-Organization-ID")).toBe(ORG);
  });

  it("confirms a reference directly when the member may confirm but not view", async () => {
    fetchMock.mockResolvedValue(json({ ...partnerClaim, status: "used", used_at: "2026-09-26T10:00:00Z" }));
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(member([PartnerClaimPermission.CLAIM_CONFIRM]), <PartnerClaims />);
    expect(screen.queryByText("Claims of your offers")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Reference"), REFERENCE);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Confirm redemption" }));
    await user.click(screen.getAllByRole("button", { name: "Confirm redemption" }).at(-1)!);

    expect(await screen.findByText(/Use was confirmed/)).toBeVisible();
    const request = posted();
    expect(path(request)).toBe(`/api/v1/partner/claims/${REFERENCE}/confirm`);
    expect(request.headers.get("X-Organization-ID")).toBe(ORG);
    expect(await request.json()).toEqual({ reason: "" });
    // Never looked anything up: viewing needs its own permission.
    expect(fetchMock.mock.calls.every(([r]) => r.method === "POST")).toBe(true);
  });

  it("rejects a malformed reference before calling the API", async () => {
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(member([PartnerClaimPermission.CLAIM_CONFIRM]), <PartnerClaims />);
    await user.type(screen.getByLabelText("Reference"), "../admin");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("A reference is 10 letters and digits")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("<AdminClaim>", () => {
  it("offers confirmation on behalf only with its permission", async () => {
    fetchMock.mockResolvedValue(json(adminClaim));
    renderAs(
      actor({ globalPermissions: new Set([ClaimAdminPermission.CLAIM_VIEW]) }),
      <AdminClaim claimId={CLAIM_ID} />,
    );
    expect(await screen.findByRole("heading", { name: adminClaim.title })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Confirm on behalf" })).not.toBeInTheDocument();
  });

  it("requires a reason to confirm on behalf", async () => {
    fetchMock.mockResolvedValue(json(adminClaim));
    const user = userEvent.setup();
    renderAs(
      actor({ globalPermissions: new Set(Object.values(ClaimAdminPermission)) }),
      <AdminClaim claimId={CLAIM_ID} />,
    );
    await user.click(await screen.findByRole("button", { name: "Confirm on behalf" }));
    await user.click(screen.getByRole("button", { name: "Confirm redemption" }));
    expect(await screen.findByText(/Give a reason/)).toBeVisible();
    expect(fetchMock.mock.calls.some(([r]) => r.method === "POST")).toBe(false);

    await user.type(screen.getByLabelText("Reason"), "Partner has no portal users");
    await user.click(screen.getByRole("button", { name: "Confirm redemption" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([r]) => r.method === "POST")).toBe(true));
    const request = posted();
    expect(path(request)).toBe(`/api/v1/admin/claims/${CLAIM_ID}/confirm`);
    expect(await request.json()).toEqual({ reason: "Partner has no portal users" });
  });
});
