import { expect, test, type Page } from "@playwright/test";

/**
 * A verified member of an organization with no capacity yet may register it as a partner, so
 * the Partner portal is their landing page. The Employer portal stays closed until Django
 * provisions Employer capacity.
 */

const USER_ID = "00000000-0000-4000-8000-000000000001";
const ACME = "00000000-0000-4000-8000-0000000000a1";

/** The request body without the given fields (audit/concurrency fields the fake ignores). */
function without(value: Record<string, unknown>, ...keys: string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

async function fakeBackend(page: Page, organizationPermissions: string[]): Promise<string[]> {
  const calls: string[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api\/v1/, "");
    calls.push(`${request.method()} ${path}`);
    if (path === "/auth/refresh") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ access_token: "t", token_type: "bearer", expires_in: 900 }),
      });
    } else if (path === "/auth/me") {
      const organizationId = (await request.headerValue("x-organization-id")) ?? null;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          actor_id: USER_ID,
          actor_type: "marketplace_staff",
          organization_id: organizationId,
          roles: [],
          permissions: [],
          organization_permissions: organizationId ? organizationPermissions : [],
          authentication_source: "local",
          memberships: [{ organization_id: ACME, name: "Acme", employer: false, partner: false }],
        }),
      });
    } else {
      throw new Error(`Unexpected API call: ${request.method()} ${path}`);
    }
  });
  return calls;
}

test("a member of an organization without capacities lands on the Partner portal", async ({
  page,
}) => {
  const calls = await fakeBackend(page, ["partners.profile.create"]);
  await page.goto("/");
  await expect(page).toHaveURL(/\/partner$/);
  await expect(page.getByRole("link", { name: /Register your business/ })).toBeVisible();
  // Registration status comes from the membership; no partner call is made before registering.
  expect(calls.filter((call) => !call.includes("/auth/"))).toEqual([]);
});

test("without partners.profile.create the portal explains what is missing", async ({ page }) => {
  await fakeBackend(page, []);
  await page.goto("/partner");
  await expect(page.getByText("Your organization is not a partner yet")).toBeVisible();
});

test("/employer stays closed without the Employer capacity", async ({ page }) => {
  const calls = await fakeBackend(page, []);
  await page.goto("/employer");
  await expect(page.getByText("You don't have access to this page")).toBeVisible();
  expect(calls.filter((call) => !call.includes("/auth/"))).toEqual([]);
});

test("a partner registers, sees rejection feedback, edits and resubmits", async ({ page }) => {
  const calls: { operation: string; organization: string | null; body: unknown }[] = [];
  // Cast so TypeScript does not narrow it to null: the route handler assigns it.
  let partner = null as Record<string, unknown> | null;
  const rejection = {
    id: "00000000-0000-4000-8000-000000000301",
    outcome: "rejected",
    partner_version: 1,
    reason: "Add a contact phone number",
    decided_by: USER_ID,
    decided_at: "2026-09-25T11:00:00Z",
  };
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api\/v1/, "");
    const organization = (await request.headerValue("x-organization-id")) ?? null;
    const operation = `${request.method()} ${path}`;
    const body = request.postData() ? request.postDataJSON() : null;
    calls.push({ operation, organization, body });
    const reply = (status: number, value: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(value) });
    switch (operation) {
      case "POST /auth/refresh":
        return reply(200, { access_token: "t", token_type: "bearer", expires_in: 900 });
      case "GET /auth/me":
        return reply(200, {
          actor_id: USER_ID,
          actor_type: "partner",
          organization_id: organization,
          roles: [],
          permissions: [],
          organization_permissions: organization
            ? [
                "partners.profile.view",
                "partners.profile.create",
                "partners.profile.update",
                "partners.profile.resubmit",
                "partners.profile_decision.view",
              ]
            : [],
          authentication_source: "local",
          memberships: [
            { organization_id: ACME, name: "Acme", employer: false, partner: partner !== null },
          ],
        });
      case "POST /partner/me":
        partner = {
          id: "00000000-0000-4000-8000-000000000201",
          organization_id: ACME,
          organization_name: "Acme",
          ...(body as object),
          status: "pending",
          intake_path: "self_service",
          registered_by: USER_ID,
          submitted_at: "2026-09-25T10:00:00Z",
          version: 1,
          latest_decision: null,
          created_at: "2026-09-25T10:00:00Z",
          updated_at: "2026-09-25T10:00:00Z",
        };
        return reply(201, partner);
      case "GET /partner/me":
        return partner ? reply(200, partner) : reply(404, { status: 404, code: "NOT_FOUND" });
      case "PUT /partner/me": {
        const profile = without(body as Record<string, unknown>, "expected_version", "reason");
        partner = { ...partner, ...profile, version: (partner?.version as number) + 1 };
        return reply(200, partner);
      }
      case "POST /partner/me/resubmit":
        partner = { ...partner, status: "pending", version: (partner?.version as number) + 1 };
        return reply(200, partner);
      case "GET /partner/me/decisions":
        return reply(200, { count: 1, next: null, previous: null, results: [rejection] });
      default:
        throw new Error(`Unexpected API call: ${operation}`);
    }
  });

  await page.goto("/partner");
  await page.getByRole("link", { name: /Register your business/ }).click();
  await page.getByLabel("Business name").fill("Acme Coffee");
  await page.getByLabel("Contact person").fill("Sita Sharma");
  await page.getByLabel("Contact email").fill("partners@acme.example");
  await page.getByRole("button", { name: "Register and submit for review" }).click();
  await expect(page).toHaveURL(/\/partner\/profile$/);
  await expect(page.getByRole("main").getByText("Awaiting Aayulogic review")).toBeVisible();

  // Aayulogic rejects it; the applicant sees the feedback next time the profile loads.
  partner = { ...partner, status: "rejected", version: 2, latest_decision: rejection };
  await page.reload();
  await expect(page.getByText("Registration rejected")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Add a contact phone number" })).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Contact phone (optional)").fill("+9779801234567");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("+9779801234567")).toBeVisible();

  await page.getByRole("button", { name: "Resubmit for review" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Resubmit" }).click();
  await expect(page.getByRole("main").getByText("Awaiting Aayulogic review")).toBeVisible();

  const portal = calls.filter((call) => call.operation.includes(" /partner/"));
  expect(portal.map((call) => call.operation)).toEqual(
    expect.arrayContaining([
      "POST /partner/me",
      "GET /partner/me",
      "PUT /partner/me",
      "POST /partner/me/resubmit",
      "GET /partner/me/decisions",
    ]),
  );
  // Every portal call acts for the selected organization.
  for (const call of portal) expect(call.organization, call.operation).toBe(ACME);
  expect(calls.find((call) => call.operation === "PUT /partner/me")?.body).toMatchObject({
    contact_phone: "+9779801234567",
    expected_version: 2,
  });
});
