import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeQueryClient, setActiveOrganizationId, type Schemas } from "@/shared/api";
import { SessionContext, type CurrentActor, type SessionValue } from "@/shared/auth";
import {
  AnalyticsAdminPermission,
  PartnerAnalyticsPermission,
  type PermissionCode,
} from "@/shared/authorization";

import { AdminReports } from "./admin-reports";
import { PartnerAnalytics } from "./partner-analytics";

const replace = vi.fn();
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  usePathname: () => "/partner/analytics",
  useSearchParams: () => search,
}));

const ORG = "4a293c96-2952-43ac-bf39-bdfda7531c48";
const OFFER_ID = "6a1c9d2e-4b7f-4e3a-8c5d-1f2e3a4b5c6d";
const EMPLOYER_ID = "57a70ccd-174a-4501-ae31-712d32e778ca";

const summary: Schemas["OfferReportSummary"] = {
  start: "2026-09-01",
  end: "2026-09-03",
  interval: "day",
  time_zone: "Asia/Kathmandu",
  generated_at: "2026-09-26T10:15:00Z",
  totals: { views: 128, claims: 41, redemptions: 17 },
  series: [
    { period_start: "2026-09-01", views: 100, claims: 30, redemptions: 10 },
    { period_start: "2026-09-02", views: 0, claims: 0, redemptions: 0 },
    { period_start: "2026-09-03", views: 28, claims: 11, redemptions: 7 },
  ],
};

const row: Schemas["AdminOfferReport"] = {
  offer_id: OFFER_ID,
  title: "20% off at Himalayan Coffee House",
  display_status: "active",
  partner_id: "0f6b1f7e-3c52-4d8e-9a41-5b7c2e9d0a13",
  partner_name: "Himalayan Coffee House",
  views: 128,
  claims: 41,
  redemptions: 17,
};

const page = <T,>(results: T[]) => ({ count: results.length, next: null, previous: null, results });

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
const url = (request: Request) => new URL(request.url);
const requests = (suffix: string) =>
  fetchMock.mock.calls.map(([r]) => r).filter((r) => url(r).pathname.endsWith(suffix));

function actor(overrides: Partial<CurrentActor>): CurrentActor {
  return {
    id: "actor-1",
    actorType: "marketplace_staff",
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

function member(permissions: PermissionCode[], partner = true): CurrentActor {
  return actor({
    organization: { id: ORG, permissions: new Set(permissions) },
    memberships: [{ organizationId: ORG, name: "Himalayan Coffee", employer: false, partner }],
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

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async (request) => {
    const path = url(request).pathname;
    if (path.endsWith("/summary")) return json(summary);
    if (path.endsWith("/by-employer")) {
      return json(
        page([
          {
            organization_id: EMPLOYER_ID,
            organization_name: "Acme Nepal",
            views: 64,
            claims: 22,
            redemptions: 9,
          },
        ]),
      );
    }
    return json(page([row]));
  });
});
afterEach(() => {
  setActiveOrganizationId(null);
  search = new URLSearchParams();
  fetchMock.mockReset();
  replace.mockReset();
  vi.unstubAllGlobals();
});

describe("Partner analytics", () => {
  it("shows totals and per-offer rows for the selected organization", async () => {
    setActiveOrganizationId(ORG);
    search = new URLSearchParams("range=custom&start=2026-09-01&end=2026-09-03");
    renderAs(member([PartnerAnalyticsPermission.OFFER_REPORT_VIEW]), <PartnerAnalytics />);

    expect(await screen.findByText("128", { selector: "p" })).toBeVisible();
    expect(await screen.findByRole("cell", { name: row.title })).toBeVisible();
    expect(screen.queryByText(row.partner_name)).toBeNull();
    expect(screen.getByText(/reported on each advertisement/)).toBeVisible();

    const [summaryRequest] = requests("/partner/analytics/offers/summary");
    expect(summaryRequest?.headers.get("X-Organization-ID")).toBe(ORG);
    expect(Object.fromEntries(url(summaryRequest!).searchParams)).toEqual({
      start: "2026-09-01",
      end: "2026-09-03",
      interval: "day",
    });
    // Unsorted, the API's default applies (most claims first); the first page is requested.
    const [listRequest] = requests("/partner/analytics/offers");
    expect(url(listRequest!).searchParams.get("ordering")).toBeNull();
    expect(url(listRequest!).searchParams.get("offset")).toBe("0");
  });

  it("selects one offer's trend through the URL", async () => {
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(member([PartnerAnalyticsPermission.OFFER_REPORT_VIEW]), <PartnerAnalytics />);
    await user.click(await screen.findByRole("button", { name: "Show trend" }));
    expect(replace).toHaveBeenCalledWith(`/partner/analytics?offer_id=${OFFER_ID}`, {
      scroll: false,
    });
  });

  it("reports an invalid custom range without calling the API", async () => {
    setActiveOrganizationId(ORG);
    search = new URLSearchParams("range=custom&start=2026-09-30&end=2026-09-01");
    renderAs(member([PartnerAnalyticsPermission.OFFER_REPORT_VIEW]), <PartnerAnalytics />);
    expect(await screen.findByText(/must not be after the end date/)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks an organization that is not a partner to register first", () => {
    setActiveOrganizationId(ORG);
    renderAs(member([PartnerAnalyticsPermission.OFFER_REPORT_VIEW], false), <PartnerAnalytics />);
    expect(screen.getByText("Your organization is not a partner yet")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Admin reports", () => {
  it("shows offer and employer breakdowns and filters by employer", async () => {
    search = new URLSearchParams("interval=week");
    const user = userEvent.setup();
    renderAs(
      actor({ globalPermissions: new Set([AnalyticsAdminPermission.OFFER_REPORT_VIEW]) }),
      <AdminReports />,
    );
    expect(await screen.findByText(row.partner_name)).toBeVisible();
    expect(await screen.findByText("Acme Nepal")).toBeVisible();
    expect(url(requests("/admin/analytics/offers/summary")[0]!).searchParams.get("interval")).toBe(
      "week",
    );
    // No organization header on admin paths.
    expect(requests("/admin/analytics/offers")[0]?.headers.get("X-Organization-ID")).toBeNull();

    await user.click(screen.getByRole("button", { name: "This employer" }));
    expect(replace).toHaveBeenCalledWith(
      `/partner/analytics?interval=week&organization_id=${EMPLOYER_ID}`,
      { scroll: false },
    );
  });
});
