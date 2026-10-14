import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CompanyUsersPanel } from "@/features/clients/components/company-users";
import { makeQueryClient, setActiveClientId, type Schemas } from "@/shared/api";
import { SessionContext, type CurrentActor, type SessionValue } from "@/shared/auth";
import {
  ClientAdministrationPermission,
  FeatureFlagAdminPermission,
  IdentityPermission,
  OrganizationAdminPermission,
  PartnerAdminPermission,
  type PermissionCode,
} from "@/shared/authorization";

import { ClientAdministration } from "./client-administration";
import { OnboardMerchant } from "./onboard-merchant";

// Business parties and onboarding: the client card's contact invitation, assisted merchant
// onboarding and a client's company users.

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const CLIENT_ID = "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b";
const COMPANY_ID = "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f";
const USER_ID = "9d31c4aa-1f99-4c90-b748-e00893786136";
const MEMBERSHIP_ID = "9d1c7a52-61b4-4f0e-b7a3-0c5e2f8d4a11";

const client: Schemas["Partner"] = {
  id: CLIENT_ID,
  kind: "client",
  contact_is_member: false,
  organization_id: null,
  organization_name: null,
  external_uuid: "11111111-2222-4333-8444-555555555555",
  active: true,
  employer_auto_enabled: false,
  country: "NP",
  business_name: "Acme Group",
  category: "",
  description: "",
  contact_name: "Ram Sharma",
  contact_email: "group-hr@acme.example",
  contact_phone: "",
  website: "",
  status: "pending",
  intake_path: "realhrsoft_sync",
  source: "realhrsoft",
  registered_by: "system:realhrsoft_sync",
  submitted_at: "2026-10-01T10:00:00Z",
  version: 2,
  latest_decision: null,
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-01T10:00:00Z",
};

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" },
  });
}

const emptyPage = { count: 0, next: null, previous: null, results: [] };

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

function posts() {
  return fetchMock.mock.calls.map(([r]) => r).filter((r) => r.method === "POST");
}

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  setActiveClientId(null);
  fetchMock.mockReset();
  push.mockReset();
  vi.unstubAllGlobals();
});

describe("client card: inviting the contact", () => {
  const seatCodes = [
    OrganizationAdminPermission.MEMBERSHIP_MANAGE,
    IdentityPermission.ORGANIZATION_ROLE_MANAGE,
  ];

  function serveCard({ flag }: { flag: boolean }) {
    fetchMock.mockImplementation(async (request) => {
      const path = new URL(request.url).pathname;
      if (path.endsWith("/members")) return json(emptyPage);
      if (path.endsWith("/feature-flags"))
        return json([{ key: "realhrsoft.client_provisioning", enabled: flag }]);
      return json({
        outcome: "created",
        created_account: true,
        user_id: USER_ID,
        membership_id: MEMBERSHIP_ID,
        skipped: null,
      });
    });
  }

  it("needs admission and role-grant authority", async () => {
    serveCard({ flag: true });
    renderAs(
      admin([OrganizationAdminPermission.MEMBERSHIP_MANAGE]),
      <ClientAdministration partner={client} />,
    );
    expect(await screen.findByText("Not a member")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Invite contact" })).not.toBeInTheDocument();
  });

  it("invites the contact with an audited reason", async () => {
    serveCard({ flag: true });
    const user = userEvent.setup();
    renderAs(admin(seatCodes), <ClientAdministration partner={client} />);
    await user.click(await screen.findByRole("button", { name: "Invite contact" }));
    await user.type(screen.getByLabelText("Reason"), "New client");
    await user.click(screen.getAllByRole("button", { name: "Invite contact" }).at(-1)!);

    await waitFor(() => expect(posts()).toHaveLength(1));
    const [request] = posts();
    expect(new URL(request!.url).pathname).toBe(
      `/api/v1/admin/partners/${CLIENT_ID}/invite-contact`,
    );
    expect(await request!.json()).toEqual({ reason: "New client" });
  });

  it("shows the switch and blocks inviting while it is off", async () => {
    serveCard({ flag: false });
    renderAs(
      admin([...seatCodes, FeatureFlagAdminPermission.FLAG_VIEW]),
      <ClientAdministration partner={client} />,
    );
    expect(await screen.findByText(/Off \(realhrsoft.client_provisioning\)/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Invite contact" })).toBeDisabled();
  });
});

describe("<OnboardMerchant>", () => {
  it("creates the organization, merchant and administrator in one request", async () => {
    fetchMock.mockImplementation(async () =>
      json(
        {
          ...client,
          id: "0b0b5e3c-3c3f-4bd6-9a55-8f3b7f0a8f2e",
          kind: "merchant",
          business_name: "Himalayan Coffee House",
          administrator: {
            outcome: "created",
            created_account: true,
            user_id: USER_ID,
            membership_id: MEMBERSHIP_ID,
          },
        },
        201,
      ),
    );
    const user = userEvent.setup();
    renderAs(admin([PartnerAdminPermission.PARTNER_CREATE]), <OnboardMerchant />);

    await user.type(screen.getByLabelText("Business name"), "Himalayan Coffee House");
    await user.type(screen.getByLabelText("Contact person"), "Sita Sharma");
    await user.type(screen.getByLabelText("Contact email"), "partners@coffee.example");
    await user.type(screen.getByLabelText("Reason"), "Signed at the desk");
    await user.click(screen.getByRole("button", { name: "Onboard merchant" }));
    // The organization and administrator are required too.
    expect(await screen.findByText("Enter the organization's name")).toBeVisible();
    expect(posts()).toHaveLength(0);

    await user.type(
      screen.getByLabelText("Organization (legal name)"),
      "Himalayan Coffee Pvt. Ltd.",
    );
    await user.type(screen.getByLabelText("Administrator email"), "owner@coffee.example");
    await user.type(screen.getByLabelText("First name"), "Sita");
    await user.type(screen.getByLabelText("Last name"), "Sharma");
    await user.click(screen.getByRole("button", { name: "Onboard merchant" }));

    await waitFor(() => expect(posts()).toHaveLength(1));
    const [request] = posts();
    expect(new URL(request!.url).pathname).toBe("/api/v1/admin/merchants");
    expect(await request!.json()).toMatchObject({
      organization_name: "Himalayan Coffee Pvt. Ltd.",
      business_name: "Himalayan Coffee House",
      administrator: { email: "owner@coffee.example", first_name: "Sita", last_name: "Sharma" },
      reason: "Signed at the desk",
    });
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/admin/partners/0b0b5e3c-3c3f-4bd6-9a55-8f3b7f0a8f2e"),
    );
  });
});

describe("<CompanyUsersPanel>", () => {
  const users = (remaining: number, pending = true): Schemas["CompanyUsers"] => ({
    company_id: COMPANY_ID,
    company_name: "Acme Nepal",
    limit: 3,
    remaining,
    users: [
      {
        id: MEMBERSHIP_ID,
        user_id: USER_ID,
        email: "hr@acme-nepal.example",
        first_name: "Nirmala",
        last_name: "Joshi",
        password_setup_pending: pending,
        is_current: true,
        verified_at: "2026-10-15T09:15:00Z",
        verified_by: "admin-1",
        ended_at: null,
        ended_by: null,
      },
    ],
  });

  function clientAdmin(codes: PermissionCode[]): CurrentActor {
    setActiveClientId(CLIENT_ID);
    return {
      ...admin([]),
      client: { id: CLIENT_ID, permissions: new Set(codes) },
      clients: [{ clientId: CLIENT_ID, name: "Acme Group" }],
    };
  }

  it("shows the places left and adds a user to the company", async () => {
    fetchMock.mockImplementation(async (request) =>
      request.method === "GET"
        ? json(users(2))
        : json({ outcome: "created", created_account: true, user: users(1).users[0] }, 201),
    );
    const user = userEvent.setup();
    renderAs(
      clientAdmin([ClientAdministrationPermission.COMPANY_USER_MANAGE]),
      <CompanyUsersPanel companyId={COMPANY_ID} />,
    );
    expect(await screen.findByText(/2 of 3 places left/)).toBeVisible();
    expect(screen.getByText("Not set yet")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Add user" }));
    await user.type(screen.getByLabelText("Email"), "finance@acme-nepal.example");
    await user.type(screen.getByLabelText("First name"), "Ram");
    await user.type(screen.getByLabelText("Last name"), "Thapa");
    await user.type(screen.getByLabelText("Reason"), "Finance officer");
    await user.click(screen.getAllByRole("button", { name: "Add user" }).at(-1)!);

    await waitFor(() => expect(posts()).toHaveLength(1));
    const [request] = posts();
    expect(new URL(request!.url).pathname).toBe(`/api/v1/client/companies/${COMPANY_ID}/users`);
    expect(request!.headers.get("X-Client-ID")).toBe(CLIENT_ID);
    expect(await request!.json()).toEqual({
      email: "finance@acme-nepal.example",
      first_name: "Ram",
      last_name: "Thapa",
      reason: "Finance officer",
    });
  });

  it("cannot add beyond the limit, and reads without the manage code", async () => {
    fetchMock.mockImplementation(async () => json(users(0, false)));
    const { unmount } = renderAs(
      clientAdmin([ClientAdministrationPermission.COMPANY_USER_MANAGE]),
      <CompanyUsersPanel companyId={COMPANY_ID} />,
    );
    expect(await screen.findByRole("button", { name: "Add user" })).toBeDisabled();
    unmount();

    renderAs(clientAdmin([]), <CompanyUsersPanel companyId={COMPANY_ID} />);
    expect(await screen.findByText("hr@acme-nepal.example")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add user" })).not.toBeInTheDocument();
  });
});
