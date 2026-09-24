import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeQueryClient, type Schemas } from "@/shared/api";
import { SessionContext, type CurrentActor, type SessionValue } from "@/shared/auth";
import {
  OrganizationAdminPermission,
  PartnerApplicantPermission,
  PartnerPermission,
  type PermissionCode,
} from "@/shared/authorization";

import { OwnPartnerProfile, OwnPartnerStanding } from "./own-partner";
import { PartnerRecord } from "./partner-record";
import { PartnerRegistration } from "./partner-registration";
import { parsePartnerSearch, PartnersDirectory } from "./partners-directory";

const navigation = vi.hoisted(() => ({ search: "", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/partners",
  useRouter: () => ({ replace: navigation.replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

const ORG = "00000000-0000-4000-8000-0000000000a1";
const PARTNER = "00000000-0000-4000-8000-0000000000e1";
const NOW = "2026-09-24T10:00:00Z";

const listItem: Schemas["PartnerAdminListItem"] = {
  partner_id: PARTNER,
  organization_id: ORG,
  legal_business_name: "Acme Travel Pvt Ltd",
  display_name: "Acme Travel",
  verification_status: "verified",
  operational_status: "active",
  marketplace_eligible: true,
  created_at: NOW,
  updated_at: NOW,
};

const profile: Schemas["PartnerProfileView"] = {
  ...listItem,
  registration_number: "REG-1",
  tax_identifier: null,
  website: null,
  description: null,
  version: 3,
  contacts: [
    {
      id: "c1",
      name: "Ana",
      title: null,
      email: "ana@acme.example",
      phone: null,
      is_primary: true,
    },
  ],
  locations: [],
};

const verification: Schemas["PartnerVerificationView"] = {
  partner_id: PARTNER,
  verification_status: "under_review",
  submitted_at: NOW,
  review_started_at: NOW,
  decision_applied_at: null,
  decision_reference: null,
  review_note: null,
  requirements: [
    { code: "primary_contact", description: "A primary contact", satisfied: true },
    { code: "registration_document", description: "Registration certificate", satisfied: false },
  ],
  documents: [],
};

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();
type Handler = (url: URL) => Response;
let routes: Record<string, Handler> = {};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" },
  });
}

const notFound = () =>
  json({ type: "about:blank", title: "Not found", status: 404, code: "NOT_FOUND" }, 404);

function requested(): URL[] {
  return fetchMock.mock.calls.map(([request]) => new URL(request.url));
}

function actor(global: PermissionCode[], organization: PermissionCode[] = []): CurrentActor {
  return {
    id: "user-1",
    actorType: "staff",
    authenticationSource: "local",
    roles: [],
    globalPermissions: new Set(global),
    organization: organization.length ? { id: ORG, permissions: new Set(organization) } : null,
    memberships: [],
  };
}

function renderWith(current: CurrentActor, ui: ReactNode) {
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

beforeEach(() => {
  navigation.search = "";
  navigation.replace.mockReset();
  routes = {};
  vi.stubGlobal("fetch", fetchMock);
  // Radix measures some controls (the checkbox) with ResizeObserver, which jsdom lacks.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  fetchMock.mockImplementation(async (request) => {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/v1/, "");
    // Routes are keyed "METHOD /path", or just "/path" for GET.
    const handler =
      routes[`${request.method} ${path}`] ?? (request.method === "GET" ? routes[path] : undefined);
    return handler ? handler(url) : notFound();
  });
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("parsePartnerSearch", () => {
  it("defaults to newest first over all Partners", () => {
    expect(parsePartnerSearch(new URLSearchParams())).toEqual({
      verifiedOnly: false,
      search: "",
      verificationStatus: undefined,
      operationalStatus: undefined,
      organizationId: undefined,
      sort: "-created_at",
    });
  });

  it("drops values the API would reject", () => {
    const search = parsePartnerSearch(
      new URLSearchParams(
        "verification_status=bogus&operational_status=gone&organization_id=../x&sort=name",
      ),
    );
    expect(search.verificationStatus).toBeUndefined();
    expect(search.operationalStatus).toBeUndefined();
    expect(search.organizationId).toBeUndefined();
    expect(search.sort).toBe("-created_at");
  });
});

describe("<PartnersDirectory>", () => {
  it("searches all Partners with the URL filters and follows the cursor", async () => {
    navigation.search = "q=acme&verification_status=under_review&operational_status=active";
    routes["/admin/partners"] = (url) =>
      json(
        url.searchParams.get("cursor")
          ? {
              items: [{ ...listItem, partner_id: "p2", display_name: "Second" }],
              next_cursor: null,
            }
          : { items: [listItem], next_cursor: "next-1" },
      );
    renderWith(actor([OrganizationAdminPermission.PARTNER_SEARCH]), <PartnersDirectory />);

    expect(await screen.findByRole("link", { name: "Acme Travel" })).toHaveAttribute(
      "href",
      `/admin/partners/${PARTNER}`,
    );
    const [first] = requested();
    expect(first?.searchParams.get("search")).toBe("acme");
    expect(first?.searchParams.get("verification_status")).toBe("under_review");
    expect(first?.searchParams.get("operational_status")).toBe("active");
    expect(first?.searchParams.get("sort")).toBe("-created_at");

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Second")).toBeInTheDocument();
    const second = requested()[1];
    expect(second?.searchParams.get("cursor")).toBe("next-1");
    expect(second?.searchParams.get("verification_status")).toBe("under_review");
  });

  it("lists verified Partners through the verified endpoint", async () => {
    navigation.search = "view=verified&verification_status=draft";
    routes["/admin/partners/verified"] = () => json({ items: [listItem], next_cursor: null });
    renderWith(actor([OrganizationAdminPermission.PARTNER_SEARCH]), <PartnersDirectory />);

    expect(await screen.findByText("Acme Travel")).toBeInTheDocument();
    const [call] = requested();
    expect(call?.pathname).toBe("/api/v1/admin/partners/verified");
    expect(call?.searchParams.has("verification_status")).toBe(false);
    expect(screen.queryByLabelText("Filter by verification status")).not.toBeInTheDocument();
  });

  it("keeps the view in the URL", async () => {
    routes["/admin/partners"] = () => json({ items: [], next_cursor: null });
    renderWith(actor([OrganizationAdminPermission.PARTNER_SEARCH]), <PartnersDirectory />);

    expect(await screen.findByText("No partners found")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Verified" }));
    expect(navigation.replace).toHaveBeenCalledWith("/admin/partners?view=verified");
  });
});

async function sentBody(method: string, path: string): Promise<unknown> {
  const call = fetchMock.mock.calls.find(
    ([request]) => request.method === method && new URL(request.url).pathname === `/api/v1${path}`,
  );
  expect(call, `${method} ${path}`).toBeDefined();
  return call?.[0].json();
}

describe("<OwnPartnerProfile>", () => {
  const viewer = actor([], [PartnerPermission.PROFILE_VIEW]);

  beforeEach(() => {
    routes["/partner/me"] = () => json(profile);
    routes["/partner/me/verification-status"] = () => json(verification);
  });

  it("shows the profile and verification, read-only without edit grants", async () => {
    renderWith(viewer, <OwnPartnerProfile />);

    expect(await screen.findByText("Acme Travel Pvt Ltd", { selector: "p" })).toBeInTheDocument();
    expect(await screen.findByText("Under review")).toBeInTheDocument();
    expect(screen.getByText(/1 outstanding/)).toBeInTheDocument();
    expect(screen.getByText("Registration certificate")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add contact" })).not.toBeInTheDocument();
  });

  it("adds a contact to the selected organization's Partner with the loaded version", async () => {
    routes["POST /partner/me/contacts"] = () => json({ id: "c2", version: 4 }, 201);
    renderWith(
      actor([], [PartnerPermission.PROFILE_VIEW, PartnerPermission.CONTACT_MANAGE]),
      <OwnPartnerProfile />,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Add contact" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Name"), "Ram");
    await userEvent.type(within(dialog).getByLabelText("Phone"), "+977 1 4000000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add contact" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await sentBody("POST", "/partner/me/contacts")).toEqual({
      name: "Ram",
      title: null,
      email: null,
      phone: "+977 1 4000000",
      primary: false,
      version: 3,
    });
  });

  it("keeps verified identifiers fixed when editing the business details", async () => {
    routes["PATCH /partner/me"] = () => json({ version: 4 });
    renderWith(
      actor([], [PartnerPermission.PROFILE_VIEW, PartnerPermission.PROFILE_EDIT]),
      <OwnPartnerProfile />,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Legal business name")).toBeDisabled();
    const display = screen.getByLabelText("Display name");
    await userEvent.clear(display);
    await userEvent.type(display, "Acme Trips");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await sentBody("PATCH", "/partner/me")).toEqual({
      legal_name: "Acme Travel Pvt Ltd",
      display_name: "Acme Trips",
      registration_number: "REG-1",
      tax_identifier: null,
      website: null,
      description: null,
      version: 3,
    });
  });

  it("reports a missing Partner as an error", async () => {
    delete routes["/partner/me"];
    renderWith(viewer, <OwnPartnerProfile />);
    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
  });
});

describe("<OwnPartnerStanding>", () => {
  const viewer = actor([], [PartnerPermission.PROFILE_VIEW]);

  it("shows eligibility and outstanding requirements", async () => {
    routes["/partner/me/marketplace-eligibility"] = () =>
      json({
        partner_id: PARTNER,
        verification_status: "verified",
        operational_status: "suspended",
        marketplace_eligible: false,
      });
    routes["/partner/me/verification-requirements"] = () => json(verification.requirements);
    renderWith(viewer, <OwnPartnerStanding />);

    expect(await screen.findByText("Not eligible")).toBeInTheDocument();
    expect(screen.getByText("Suspended")).toBeInTheDocument();
    expect(await screen.findByText("Registration certificate")).toBeInTheDocument();
  });
});

const APPLICANT = Object.values(PartnerApplicantPermission);
const draft: Schemas["PartnerRegistrationView"] = {
  profile: {
    ...profile,
    organization_id: null,
    verification_status: "draft",
    marketplace_eligible: false,
    version: 1,
    contacts: [],
  },
  verification: {
    ...verification,
    verification_status: "draft",
    submitted_at: null,
    review_started_at: null,
    requirements: [
      { code: "primary_contact", description: "Add a primary contact", satisfied: false },
    ],
  },
};

describe("<PartnerRegistration>", () => {
  it("explains that registration needs the applicant role", () => {
    renderWith(actor([]), <PartnerRegistration />);

    expect(screen.getByText(/not enabled for your account/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("starts a registration with the business details", async () => {
    routes["POST /partner/registration"] = () => json({ id: PARTNER }, 201);
    renderWith(actor(APPLICANT), <PartnerRegistration />);

    await userEvent.type(await screen.findByLabelText("Legal business name"), "Acme Pvt Ltd");
    await userEvent.type(screen.getByLabelText("Display name"), "Acme");
    await userEvent.type(screen.getByLabelText("Registration number"), "REG-1");
    await userEvent.click(screen.getByRole("button", { name: "Save and continue" }));

    expect(await sentBody("POST", "/partner/registration")).toEqual({
      legal_name: "Acme Pvt Ltd",
      display_name: "Acme",
      registration_number: "REG-1",
      tax_identifier: null,
      website: null,
      description: null,
    });
  });

  it("walks a draft through the steps and blocks submission until it is complete", async () => {
    routes["/partner/registration"] = () => json(draft);
    renderWith(actor(APPLICANT), <PartnerRegistration />);

    expect(await screen.findByRole("button", { name: /Business details/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("No contacts yet.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Review and submit/ }));
    expect(screen.getByText("1 requirement still outstanding.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit for verification" })).toBeDisabled();
  });

  it("submits a complete registration with its version", async () => {
    routes["/partner/registration"] = () =>
      json({
        ...draft,
        verification: {
          ...draft.verification,
          requirements: [{ code: "primary_contact", description: "Contact", satisfied: true }],
        },
      });
    routes[`POST /partner/registration/${PARTNER}/submit`] = () => json({ version: 2 });
    renderWith(actor(APPLICANT), <PartnerRegistration />);

    await userEvent.click(await screen.findByRole("button", { name: /Review and submit/ }));
    await userEvent.click(screen.getByRole("button", { name: "Submit for verification" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Submit" }),
    );

    expect(await sentBody("POST", `/partner/registration/${PARTNER}/submit`)).toEqual({
      version: 1,
    });
  });

  it("shows a submitted registration read-only with the reviewer's note", async () => {
    routes["/partner/registration"] = () =>
      json({
        profile: { ...profile, organization_id: null, verification_status: "under_review" },
        verification,
      });
    renderWith(actor(APPLICANT), <PartnerRegistration />);

    expect(await screen.findByText(/Aayulogic is reviewing/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add contact" })).not.toBeInTheDocument();
  });
});

describe("<PartnerRecord>", () => {
  beforeEach(() => {
    routes[`/admin/partners/${PARTNER}`] = () =>
      json({ ...profile, verification_status: "submitted", organization_id: null });
    routes[`/admin/partners/${PARTNER}/verification`] = () =>
      json({ ...verification, verification_status: "submitted" });
  });

  it("shows no review actions without the reviewer permission", async () => {
    renderWith(
      actor([OrganizationAdminPermission.PARTNER_VIEW]),
      <PartnerRecord partnerId={PARTNER} />,
    );
    expect(await screen.findByText("Registration certificate")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeInTheDocument();
  });

  it("requests changes with an audited reason and the loaded version", async () => {
    routes[`POST /admin/partners/${PARTNER}/request-changes`] = () => json({ version: 4 });
    renderWith(
      actor([
        OrganizationAdminPermission.PARTNER_VIEW,
        OrganizationAdminPermission.PARTNER_VERIFICATION_REVIEW,
      ]),
      <PartnerRecord partnerId={PARTNER} />,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Request changes" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Reason"), "Add the tax ID");
    await userEvent.click(within(dialog).getByRole("button", { name: "Request changes" }));

    expect(await sentBody("POST", `/admin/partners/${PARTNER}/request-changes`)).toEqual({
      version: 3,
      reason: "Add the tax ID",
    });
  });

  it("verifies onto a new organization unless one is named", async () => {
    routes[`POST /admin/partners/${PARTNER}/verify`] = () => json({ version: 4 });
    renderWith(
      actor([
        OrganizationAdminPermission.PARTNER_VIEW,
        OrganizationAdminPermission.PARTNER_VERIFICATION_REVIEW,
      ]),
      <PartnerRecord partnerId={PARTNER} />,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Verify" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Reason"), "Registry checked");
    await userEvent.click(within(dialog).getByRole("button", { name: "Verify" }));

    expect(await sentBody("POST", `/admin/partners/${PARTNER}/verify`)).toEqual({
      version: 3,
      reason: "Registry checked",
      organization_id: null,
    });
  });

  it("suspends an active Partner with a reason", async () => {
    routes[`POST /admin/partners/${PARTNER}/suspend`] = () => json({ version: 4 });
    renderWith(
      actor([
        OrganizationAdminPermission.PARTNER_VIEW,
        OrganizationAdminPermission.PARTNER_SUSPEND,
      ]),
      <PartnerRecord partnerId={PARTNER} />,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Suspend" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Reason"), "Unpaid invoices");
    await userEvent.click(within(dialog).getByRole("button", { name: "Suspend" }));

    expect(await sentBody("POST", `/admin/partners/${PARTNER}/suspend`)).toEqual({
      version: 3,
      reason: "Unpaid invoices",
    });
  });
});
