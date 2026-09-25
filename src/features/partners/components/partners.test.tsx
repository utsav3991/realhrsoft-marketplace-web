import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeQueryClient, setActiveOrganizationId, type Schemas } from "@/shared/api";
import { SessionContext, type CurrentActor, type SessionValue } from "@/shared/auth";
import {
  PartnerAdminPermission,
  PartnerPermission,
  type PermissionCode,
} from "@/shared/authorization";

import { OwnPartnerProfile, PartnerDashboard } from "./own-partner";
import { PartnerRecord } from "./partner-record";

const PARTNER_ID = "0b0b5e3c-3c3f-4bd6-9a55-8f3b7f0a8f2e";
const ORG = "4a293c96-2952-43ac-bf39-bdfda7531c48";

const decision: Schemas["PartnerDecision"] = {
  id: "c1f0e7a2-5d1b-4e0e-9a3f-2b6d7c8e9f01",
  outcome: "rejected",
  partner_version: 1,
  reason: "Registration number does not match the trading name.",
  decided_by: "57a70ccd-174a-4501-ae31-712d32e778ca",
  decided_at: "2026-09-25T11:00:00Z",
};

const pending: Schemas["Partner"] = {
  id: PARTNER_ID,
  organization_id: ORG,
  organization_name: "Himalayan Coffee Pvt. Ltd.",
  business_name: "Himalayan Coffee House",
  category: "Restaurant",
  description: "",
  contact_name: "Sita Sharma",
  contact_email: "partners@himalayancoffee.example",
  contact_phone: "",
  website: "",
  status: "pending",
  intake_path: "self_service",
  registered_by: "9d31c4aa-1f99-4c90-b748-e00893786136",
  submitted_at: "2026-09-25T10:00:00Z",
  version: 1,
  latest_decision: null,
  created_at: "2026-09-25T10:00:00Z",
  updated_at: "2026-09-25T10:00:00Z",
};
const rejected: Schemas["Partner"] = {
  ...pending,
  status: "rejected",
  version: 2,
  latest_decision: decision,
};

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" },
  });
}

function serve(partner: Schemas["Partner"]) {
  fetchMock.mockImplementation(async (request) => {
    const path = new URL(request.url).pathname;
    if (path.endsWith("/decisions")) {
      return json({ count: 1, next: null, previous: null, results: [decision] });
    }
    if (request.method === "GET") return json(partner);
    return json({ ...partner, status: "verified", version: partner.version + 1 });
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

function member(permissions: PermissionCode[], registered = true): CurrentActor {
  return {
    ...admin([]),
    organization: { id: ORG, permissions: new Set(permissions) },
    memberships: [
      { organizationId: ORG, name: "Himalayan Coffee", employer: false, partner: registered },
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

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  setActiveOrganizationId(null);
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("<PartnerRecord>", () => {
  it("offers each review action only with its own permission", async () => {
    serve(pending);
    renderAs(
      admin([PartnerAdminPermission.PARTNER_VIEW, PartnerAdminPermission.PARTNER_VERIFY]),
      <PartnerRecord partnerId={PARTNER_ID} />,
    );
    expect(await screen.findByRole("heading", { name: pending.business_name })).toBeVisible();
    expect(screen.getByRole("button", { name: "Verify" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    // History needs partners.partner_decision.view, so it is neither shown nor fetched.
    expect(screen.queryByText("Decision history")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([r]) => r.url.endsWith("/decisions"))).toBe(false);
  });

  it("verifies at the loaded version with an audited reason", async () => {
    serve(pending);
    const user = userEvent.setup();
    renderAs(
      admin([PartnerAdminPermission.PARTNER_VIEW, PartnerAdminPermission.PARTNER_VERIFY]),
      <PartnerRecord partnerId={PARTNER_ID} />,
    );
    await user.click(await screen.findByRole("button", { name: "Verify" }));
    await user.type(screen.getByLabelText("Reason"), "Documents checked");
    await user.click(screen.getByRole("button", { name: "Verify partner" }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([r]) => r.method === "POST")).toBe(true),
    );
    const [request] = fetchMock.mock.calls.find(([r]) => r.method === "POST")!;
    expect(new URL(request.url).pathname).toBe(`/api/v1/admin/partners/${PARTNER_ID}/verify`);
    expect(await request.json()).toEqual({ reason: "Documents checked", expected_version: 1 });
  });

  it("offers resubmission instead of a decision once rejected", async () => {
    serve(rejected);
    renderAs(
      admin(Object.values(PartnerAdminPermission)),
      <PartnerRecord partnerId={PARTNER_ID} />,
    );
    expect(await screen.findByRole("button", { name: "Resubmit for review" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeInTheDocument();
    expect(await screen.findByText("Decision history")).toBeVisible();
  });
});

describe("Partner portal", () => {
  it("invites an unregistered organization to register only with profile.create", () => {
    renderAs(member([PartnerPermission.PROFILE_CREATE], false), <PartnerDashboard />);
    expect(screen.getByRole("link", { name: /Register your business/ })).toBeVisible();
  });

  it("explains what is missing without profile.create", () => {
    renderAs(member([], false), <PartnerDashboard />);
    expect(screen.getByText("Your organization is not a partner yet")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows rejection feedback and gates edit and resubmit separately", async () => {
    serve(rejected);
    setActiveOrganizationId(ORG);
    renderAs(
      member([PartnerPermission.PROFILE_VIEW, PartnerPermission.PROFILE_RESUBMIT]),
      <OwnPartnerProfile />,
    );
    expect(await screen.findByText(decision.reason)).toBeVisible();
    expect(screen.getByRole("button", { name: "Resubmit for review" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    const [request] = fetchMock.mock.calls[0]!;
    expect(request.headers.get("X-Organization-ID")).toBe(ORG);
  });
});
