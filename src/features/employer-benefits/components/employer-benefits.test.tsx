import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BenefitUsage } from "@/features/analytics/components/benefit-usage";
import { makeQueryClient, setActiveOrganizationId, type Schemas } from "@/shared/api";
import { SessionContext, type CurrentActor, type SessionValue } from "@/shared/auth";
import {
  BenefitAdminPermission,
  EmployerAnalyticsPermission,
  EmployerBenefitPermission,
  type PermissionCode,
} from "@/shared/authorization";

import { AdminBenefitRecord } from "./admin-benefits";
import { MyBenefits } from "./my-benefits";
import { NewOwnBenefit, OwnBenefit, OwnBenefits } from "./own-benefits";

const push = vi.fn();
const replace = vi.fn();
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/employer/benefits",
  useSearchParams: () => search,
}));

const ORG = "4a293c96-2952-43ac-bf39-bdfda7531c48";
const BENEFIT_ID = "b3c1e2d4-5f6a-4b7c-8d9e-0a1b2c3d4e5f";
const VERSION_ID = "e1d2c3b4-a596-4877-8695-a4b3c2d1e0f9";

function version(state: Schemas["OfferVersionStateEnum"]): Schemas["OfferVersion"] {
  return {
    id: VERSION_ID,
    number: 1,
    state,
    title: "Free annual health check-up",
    headline: "One free check-up a year",
    description: "A full-body check-up, paid by Acme.",
    terms: "",
    valid_from: "2026-10-01T00:00:00Z",
    valid_until: null,
    fulfillment_mode: "claim_as_use",
    benefit: { schema_version: 1, type: "descriptive", description: "Free check-up" },
    marketplace_policy: null,
    benefit_policy: { usage_rules: "Book through HR three days ahead.", max_claims_per_beneficiary: 1 },
    edit_count: 1,
    frozen_at: state === "draft" ? null : "2026-10-01T00:00:00Z",
    frozen_by: null,
    submitted_at: null,
    submitted_by: null,
    created_by: "hr",
    created_at: "2026-09-26T09:00:00Z",
    updated_at: "2026-09-26T09:00:00Z",
  };
}

/** Never published: version 1 is a draft. */
const benefit: Schemas["CompanyBenefit"] = {
  id: BENEFIT_ID,
  provider_organization: { id: ORG, name: "Acme Nepal" },
  availability: "enabled",
  version: 1,
  display_status: "draft",
  visible_to_employees: false,
  current_version: null,
  working_version: version("draft"),
  first_published_at: null,
  suspended_at: null,
  suspended_by: null,
  suspension_reason: "",
  retired_at: null,
  retired_by: null,
  latest_decision: null,
  created_by: "hr",
  updated_by: "hr",
  created_at: "2026-09-26T09:00:00Z",
  updated_at: "2026-09-26T09:00:00Z",
};
const live: Schemas["CompanyBenefit"] = {
  ...benefit,
  version: 3,
  display_status: "active",
  visible_to_employees: true,
  current_version: version("approved"),
  working_version: null,
  first_published_at: "2026-10-01T00:00:00Z",
};

const employeeBenefit: Schemas["CompanyBenefitCard"] = {
  id: BENEFIT_ID,
  version_id: VERSION_ID,
  version_number: 1,
  title: benefit.working_version!.title,
  headline: benefit.working_version!.headline,
  description: benefit.working_version!.description,
  terms: "",
  valid_from: "2026-10-01T00:00:00Z",
  valid_until: null,
  benefit: benefit.working_version!.benefit,
  usage_rules: "Book through HR three days ahead.",
  max_claims_per_beneficiary: 2,
  my_use_count: 0,
};

function use(title = employeeBenefit.title): Schemas["OwnClaimListItem"] {
  return {
    id: "c1a2b3c4-d5e6-4f70-8192-a3b4c5d6e7f8",
    kind: "employer_benefit",
    offer_id: BENEFIT_ID,
    partner: null,
    version_id: VERSION_ID,
    version_number: 1,
    title,
    headline: employeeBenefit.headline,
    status: "accepted",
    requested_at: "2026-10-05T04:30:00Z",
    decision_deadline: null,
    accepted_at: "2026-10-05T04:30:00Z",
    decision: { outcome: "accepted", source: "policy", reason: "", decided_at: "2026-10-05T04:30:00Z" },
    voucher: null,
    benefit_usage: { id: "u1", used_at: "2026-10-05T04:30:00Z", use_number: 1 },
  };
}

const page = <T,>(results: T[]) => ({ count: results.length, next: null, previous: null, results });

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status >= 400 ? "application/problem+json" : "application/json" },
  });
const problem = (status: number, code: string) =>
  json({ type: "about:blank", title: code, status, code, detail: code }, status);
const url = (request: Request) => new URL(request.url);
const requests = (method: string, suffix: string) =>
  fetchMock.mock.calls
    .map(([r]) => r)
    .filter((r) => r.method === method && url(r).pathname.endsWith(suffix));

function actor(overrides: Partial<CurrentActor>): CurrentActor {
  return {
    id: "actor-1",
    actorType: "marketplace_staff",
    authenticationSource: "local",
    roles: [],
    globalPermissions: new Set(),
    organization: null,
    memberships: [],
    ...overrides,
  };
}

function employerMember(permissions: PermissionCode[]): CurrentActor {
  return actor({
    organization: { id: ORG, permissions: new Set(permissions) },
    memberships: [{ organizationId: ORG, name: "Acme Nepal", employer: true, partner: false }],
  });
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

/** Detail, version history and decision history answer from one handler. */
function serveRecord(record: Schemas["CompanyBenefit"], write: () => Response) {
  fetchMock.mockImplementation(async (request) => {
    const path = url(request).pathname;
    if (request.method !== "GET") return write();
    if (path.endsWith("/versions")) return json(page([version("approved")]));
    if (path.endsWith("/decisions")) return json(page([]));
    return json(record);
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  setActiveOrganizationId(null);
  search = new URLSearchParams();
  fetchMock.mockReset();
  push.mockReset();
  replace.mockReset();
  vi.unstubAllGlobals();
});

describe("Employer portal", () => {
  it("lists the selected organization's benefits with the status filter", async () => {
    setActiveOrganizationId(ORG);
    search = new URLSearchParams("status=draft");
    fetchMock.mockResolvedValue(json(page([benefit])));
    renderAs(employerMember([EmployerBenefitPermission.BENEFIT_VIEW]), <OwnBenefits />);

    expect(await screen.findByRole("link", { name: employeeBenefit.title })).toBeVisible();
    expect(screen.getByText("Hidden")).toBeVisible();
    expect(screen.getByText("Once per employee")).toBeVisible();
    // Creating needs its own code.
    expect(screen.queryByRole("link", { name: /New benefit/ })).toBeNull();

    const [request] = requests("GET", "/employer/benefits");
    expect(request?.headers.get("X-Organization-ID")).toBe(ORG);
    expect(url(request!).searchParams.get("display_status")).toBe("draft");
  });

  it("creates a draft with no audience or owner field", async () => {
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(json(benefit, 201));
    renderAs(employerMember([EmployerBenefitPermission.BENEFIT_CREATE]), <NewOwnBenefit />);

    expect(screen.getByText("Own employees of Acme Nepal")).toBeVisible();
    // Publishing at creation needs its own code.
    expect(screen.queryByRole("button", { name: "Save and publish" })).toBeNull();
    await user.type(screen.getByLabelText("Title"), employeeBenefit.title);
    await user.type(screen.getByLabelText("Headline"), employeeBenefit.headline);
    await user.type(await screen.findByRole("textbox", { name: "Description" }), "Free check-up");
    await user.type(screen.getByLabelText("Benefit"), "One full-body check-up");
    await user.click(screen.getByRole("button", { name: /^Valid from/ }));
    await user.click(screen.getAllByRole("button", { name: /\b1st\b/ })[0]!);
    // user-event cannot type into a time input; set it as the browser would.
    fireEvent.change(screen.getByLabelText("Valid from time"), { target: { value: "09:00" } });
    await user.clear(screen.getByLabelText("Uses per employee"));
    await user.type(screen.getByLabelText("Uses per employee"), "3");
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith(`/employer/benefits/${BENEFIT_ID}`));
    const [request] = requests("POST", "/employer/benefits");
    expect(request?.headers.get("X-Organization-ID")).toBe(ORG);
    const body = (await request!.clone().json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      title: employeeBenefit.title,
      headline: employeeBenefit.headline,
      description: "Free check-up",
      benefit: { type: "descriptive", description: "One full-body check-up" },
      valid_until: null,
      max_claims_per_beneficiary: 3,
      intent: "save",
    });
    const validFrom = new Date(body.valid_from as string);
    expect([validFrom.getDate(), validFrom.getHours(), validFrom.getMinutes()]).toEqual([1, 9, 0]);
    expect(Object.keys(body)).not.toContain("organization_id");
    expect(Object.keys(body)).not.toContain("audience_type");
  });

  it("rejects a usage limit outside 1-1000 before calling the API", async () => {
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(employerMember([EmployerBenefitPermission.BENEFIT_CREATE]), <NewOwnBenefit />);
    await user.clear(screen.getByLabelText("Uses per employee"));
    await user.type(screen.getByLabelText("Uses per employee"), "0");
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByText("Use a whole number from 1 to 1000")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("publishes a draft with the loaded version", async () => {
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    serveRecord(benefit, () => json({ ...live, version: 2 }));
    renderAs(
      employerMember([
        EmployerBenefitPermission.BENEFIT_VIEW,
        EmployerBenefitPermission.BENEFIT_PUBLISH,
      ]),
      <OwnBenefit benefitId={BENEFIT_ID} />,
    );

    await user.click(await screen.findByRole("button", { name: "Publish" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Publish" }));

    await vi.waitFor(() => expect(requests("POST", "/publish")).toHaveLength(1));
    expect(await requests("POST", "/publish")[0]!.clone().json()).toEqual({
      expected_version: 1,
      reason: "",
    });
    // Pausing and retiring need their own codes.
    expect(screen.queryByRole("button", { name: "More actions" })).toBeNull();
  });

  it("publishes a live benefit's edit against the version it started from", async () => {
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    let record = live;
    fetchMock.mockImplementation(async (request) => {
      const path = url(request).pathname;
      if (request.method === "PUT") return problem(409, "CONFLICT");
      if (path.endsWith("/versions")) return json(page([]));
      return json(record);
    });
    const client = makeQueryClient();
    renderAs(
      employerMember([
        EmployerBenefitPermission.BENEFIT_VIEW,
        EmployerBenefitPermission.BENEFIT_UPDATE,
      ]),
      <OwnBenefit benefitId={BENEFIT_ID} />,
      client,
    );

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    record = { ...live, version: 4 };
    await client.refetchQueries();
    // A live benefit's edit is published at once; there is no draft to save.
    expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Publish changes" }));

    await vi.waitFor(() =>
      expect(requests("PUT", `/employer/benefits/${BENEFIT_ID}`)).toHaveLength(1),
    );
    const body = (await requests("PUT", `/employer/benefits/${BENEFIT_ID}`)[0]!.clone().json()) as {
      expected_version: number;
      title: string;
    };
    expect(body.expected_version).toBe(3);
    expect(body.title).toBe(employeeBenefit.title);
  });
});

describe("Admin moderation", () => {
  it("suspends a benefit with a required reason and shows its histories", async () => {
    const user = userEvent.setup();
    serveRecord(live, () => json({ ...live, suspended_at: "2026-10-02T00:00:00Z" }));
    renderAs(
      actor({
        globalPermissions: new Set([
          BenefitAdminPermission.BENEFIT_VIEW,
          BenefitAdminPermission.BENEFIT_SUSPEND,
        ]),
      }),
      <AdminBenefitRecord benefitId={BENEFIT_ID} />,
    );

    expect(await screen.findByText("Version history")).toBeVisible();
    expect(screen.getByText("Decision history")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Suspend" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Suspend benefit" }));
    expect(requests("POST", "/suspend")).toHaveLength(0);

    await user.type(within(dialog).getByRole("textbox"), "Misleading description");
    await user.click(within(dialog).getByRole("button", { name: "Suspend benefit" }));
    await vi.waitFor(() => expect(requests("POST", "/suspend")).toHaveLength(1));
    const [request] = requests("POST", "/suspend");
    expect(url(request!).pathname).toBe(`/api/v1/admin/company-benefits/${BENEFIT_ID}/suspend`);
    expect(request?.headers.get("X-Organization-ID")).toBeNull();
    expect(await request!.clone().json()).toEqual({
      expected_version: 3,
      reason: "Misleading description",
    });
  });
});

describe("Employee company benefits", () => {
  function employeeRoutes(claim: () => Response, card = employeeBenefit) {
    fetchMock.mockImplementation(async (request) => {
      const path = url(request).pathname;
      if (request.method === "POST") return claim();
      if (path.endsWith("/benefit-claims")) return json(page([]));
      return json(page([card]));
    });
  }

  it("marks benefits apart from offers and uses them with one key per attempt", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    employeeRoutes(() => {
      attempts += 1;
      return attempts === 1 ? json({ title: "Server error", status: 500 }, 500) : json(use(), 201);
    });
    renderAs(actor({ actorType: "employee" }), <MyBenefits />);

    expect(await screen.findByText("Company benefit")).toBeVisible();
    expect(screen.getByText("2 of 2 uses left")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Use benefit" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Use benefit" }));
    await within(dialog).findByRole("alert");
    await user.click(within(dialog).getByRole("button", { name: "Use benefit" }));

    await vi.waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/marketplace/company-benefits/${BENEFIT_ID}`),
    );
    const posts = requests("POST", "/marketplace/benefit-claims");
    const keys = posts.map((r) => r.headers.get("Idempotency-Key"));
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[1]).toBe(keys[0]);
    expect(await posts[0]!.clone().json()).toEqual({
      offer_id: BENEFIT_ID,
      version_id: VERSION_ID,
    });
  });

  it("shows a used-up benefit without a use button", async () => {
    employeeRoutes(() => json(use(), 201), {
      ...employeeBenefit,
      max_claims_per_beneficiary: 1,
      my_use_count: 1,
    });
    renderAs(actor({ actorType: "employee" }), <MyBenefits />);
    expect(await screen.findByText("Used")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Use benefit" })).toBeNull();
  });

  it("explains a 403 once and keeps a former employee's history", async () => {
    fetchMock.mockImplementation(async (request) =>
      url(request).pathname.endsWith("/benefit-claims")
        ? json(page([use("Old benefit")]))
        : problem(403, "FORBIDDEN"),
    );
    renderAs(actor({ actorType: "employee" }), <MyBenefits />);
    expect(await screen.findByText("Company benefits are for employees")).toBeVisible();
    expect(await screen.findByText("Old benefit")).toBeVisible();
    expect(screen.getByText("#1")).toBeVisible();
  });
});

describe("Employer benefit usage report", () => {
  it("shows claims and distinct employees, never offer metrics", async () => {
    setActiveOrganizationId(ORG);
    search = new URLSearchParams("range=custom&start=2026-09-01&end=2026-09-02");
    fetchMock.mockImplementation(async (request) =>
      url(request).pathname.endsWith("/summary")
        ? json({
            start: "2026-09-01",
            end: "2026-09-02",
            interval: "day",
            time_zone: "Asia/Kathmandu",
            generated_at: "2026-09-26T10:15:00Z",
            totals: { claims: 12, employees: 7 },
            series: [
              { period_start: "2026-09-01", claims: 12, employees: 7 },
              { period_start: "2026-09-02", claims: 0, employees: 0 },
            ],
          })
        : json(
            page([
              {
                benefit_id: BENEFIT_ID,
                title: employeeBenefit.title,
                display_status: "active",
                claims: 12,
                employees: 7,
              },
            ]),
          ),
    );
    renderAs(employerMember([EmployerAnalyticsPermission.BENEFIT_REPORT_VIEW]), <BenefitUsage />);

    expect(await screen.findByRole("cell", { name: employeeBenefit.title })).toBeVisible();
    expect(screen.getByText("12", { selector: "p" })).toBeVisible();
    expect(screen.getByText("7", { selector: "p" })).toBeVisible();
    expect(screen.queryByText("Views")).toBeNull();
    expect(screen.queryByText("Redemptions")).toBeNull();

    const [summaryRequest] = requests("GET", "/employer/analytics/benefits/summary");
    expect(summaryRequest?.headers.get("X-Organization-ID")).toBe(ORG);
    expect(url(summaryRequest!).searchParams.get("start")).toBe("2026-09-01");
    // Unsorted, the API's default applies (most claims first).
    expect(
      url(requests("GET", "/employer/analytics/benefits")[0]!).searchParams.get("ordering"),
    ).toBeNull();
  });
});
