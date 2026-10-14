import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeQueryClient, type Schemas } from "@/shared/api";
import { SessionContext, type CurrentActor, type SessionValue } from "@/shared/auth";
import { IdentityPermission, type PermissionCode } from "@/shared/authorization";

import { UserDetail } from "./user-detail";

// Tables keep their page and sort in the URL.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const USER_ID = "7d8f4c1e-0000-4000-8000-000000000001";

const user: Schemas["UserDetail"] = {
  id: USER_ID,
  email: "ana@example.com",
  username: "ana",
  first_name: "Ana",
  last_name: null,
  contact: null,
  actor_type: "marketplace_staff",
  status: "active",
  grants: [
    {
      assignment_id: "a1",
      role_id: "r1",
      role_code: "support_agent",
      client_id: null,
      role_display_name: "Support agent",
      organization_id: null,
      granted_at: "2026-09-02T10:00:00Z",
      granted_by: "admin-1",
    },
  ],
};

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" },
  });
}

function actor(id: string, permissions: PermissionCode[]): CurrentActor {
  return {
    id,
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

function renderDetail(current: CurrentActor) {
  const session: SessionValue = {
    status: "authenticated",
    actor: current,
    error: null,
    login: async () => undefined,
    logout: async () => undefined,
  };
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SessionContext.Provider value={session}>
        <UserDetail userId={USER_ID} />
      </SessionContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async (request) =>
    request.method === "GET" ? json(user) : new Response(null, { status: 204 }),
  );
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

const ALL = Object.values(IdentityPermission);

describe("<UserDetail>", () => {
  it("shows the account and its grants", async () => {
    renderDetail(actor("admin-1", [IdentityPermission.USER_VIEW]));

    expect(await screen.findByRole("heading", { name: "ana@example.com" })).toBeInTheDocument();
    expect(screen.getByText("Support agent")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Disable account/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke" })).not.toBeInTheDocument();
  });

  it("offers no changes on the administrator's own account", async () => {
    renderDetail(actor(USER_ID, ALL));

    expect(await screen.findByText(/This is your account/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Disable account/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Grant role/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke" })).not.toBeInTheDocument();
  });

  it("disables the account with an audited reason", async () => {
    renderDetail(actor("admin-1", ALL));

    await userEvent.click(await screen.findByRole("button", { name: /Disable account/ }));
    await userEvent.click(screen.getByRole("button", { name: "Disable account" }));
    expect(await screen.findByText(/Give a reason/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([request]) => request.method === "POST")).toBe(false);

    await userEvent.type(screen.getByLabelText("Reason"), "Left the company");
    await userEvent.click(screen.getByRole("button", { name: "Disable account" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const post = fetchMock.mock.calls.find(([request]) => request.method === "POST")?.[0];
    expect(new URL(post?.url ?? "").pathname).toBe(`/api/v1/admin/users/${USER_ID}/disable`);
    expect(await post?.json()).toEqual({ reason: "Left the company" });
  });

  it("keeps the dialog open and explains a refusal", async () => {
    fetchMock.mockImplementation(async (request) =>
      request.method === "GET"
        ? json(user)
        : json(
            {
              type: "about:blank",
              title: "Conflict",
              status: 409,
              code: "CONFLICT",
              detail: "The last active platform administrator cannot be removed",
            },
            409,
          ),
    );
    renderDetail(actor("admin-1", ALL));

    await userEvent.click(await screen.findByRole("button", { name: /Disable account/ }));
    await userEvent.type(screen.getByLabelText("Reason"), "Offboarding");
    await userEvent.click(screen.getByRole("button", { name: "Disable account" }));

    expect(
      await screen.findByText("The last active platform administrator cannot be removed"),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
