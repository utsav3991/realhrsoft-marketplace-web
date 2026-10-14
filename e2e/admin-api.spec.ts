import { expect, test, type Page, type Route } from "@playwright/test";

import { NO_CLIENT, answerAmbient } from "./fakes";

/**
 * Drives every administration screen against a stateful fake of the /api/v1 contract and
 * checks that each operation in openapi/v1.json is called, with the headers and bodies the
 * backend expects. Also fails on any Content-Security-Policy violation or page error.
 */

const ADMIN_ID = "00000000-0000-4000-8000-00000000000a";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const ROLE_ID = "00000000-0000-4000-8000-0000000000b1";
const SYSTEM_ROLE_ID = "00000000-0000-4000-8000-0000000000a1";
const NEW_ROLE_ID = "00000000-0000-4000-8000-0000000000c1";
const ASSIGNMENT_ID = "00000000-0000-4000-8000-0000000000d1";
const NEW_USER_ID = "00000000-0000-4000-8000-000000000002";
const ORGANIZATION_ID = "00000000-0000-4000-8000-0000000000e1";
const MEMBERSHIP_ID = "00000000-0000-4000-8000-0000000000f1";
const PARTNER_ID = "00000000-0000-4000-8000-000000000101";
const NOW = "2026-09-25T10:00:00Z";

const PERMISSIONS = [
  "identity.user.view",
  "identity.user.create",
  "identity.user.disable",
  "identity.user.reactivate",
  "identity.role.view",
  "identity.role.create",
  "identity.role_permission.manage",
  "identity.role.assign",
  "identity.role.revoke",
  "identity.permission.view",
  "organizations.organization.view",
  "organizations.organization.manage",
  "organizations.membership.manage",
  "partners.partner.view",
  "partners.partner.create",
  "partners.partner.update",
  "partners.partner.resubmit",
  "partners.partner.verify",
  "partners.partner.reject",
  "partners.partner_decision.view",
];

const ALL_OPERATIONS = [
  "POST /auth/login",
  "POST /auth/refresh",
  "POST /auth/logout",
  "GET /auth/me",
  "GET /admin/users",
  "POST /admin/users",
  "GET /admin/users/{user_id}",
  "POST /admin/users/{user_id}/disable",
  "POST /admin/users/{user_id}/reactivate",
  "POST /admin/users/{user_id}/roles",
  "POST /admin/users/{user_id}/roles/{assignment_id}/revoke",
  "GET /admin/roles",
  "POST /admin/roles",
  "GET /admin/roles/{role_id}",
  "PUT /admin/roles/{role_id}/permissions",
  "GET /admin/permissions",
  "GET /admin/organizations",
  "POST /admin/organizations",
  "GET /admin/organizations/{organization_id}",
  "PUT /admin/organizations/{organization_id}",
  "GET /admin/organizations/{organization_id}/memberships",
  "POST /admin/organizations/{organization_id}/memberships",
  "POST /admin/organizations/{organization_id}/memberships/{membership_id}/end",
  "GET /admin/partners",
  "POST /admin/partners",
  "GET /admin/partners/{partner_id}",
  "PUT /admin/partners/{partner_id}",
  "POST /admin/partners/{partner_id}/verify",
  "POST /admin/partners/{partner_id}/reject",
  "POST /admin/partners/{partner_id}/resubmit",
  "GET /admin/partners/{partner_id}/decisions",
];

interface Call {
  operation: string;
  body: unknown;
  authorization: string | null;
  requestId: string | null;
}

function role(id: string, code: string, name: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    code,
    display_name: name,
    description: null,
    status: "active",
    is_system: false,
    version: 1,
    active_assignments: 0,
    permissions: [{ code: "identity.user.view", delegable: false }],
    scope: "global",
    ...extra,
  };
}

/** A small in-memory backend. Returns the log of calls it served. */
async function fakeBackend(page: Page, { signedIn = false } = {}): Promise<Call[]> {
  const calls: Call[] = [];
  let userStatus: "active" | "disabled" = "active";
  let grants: { assignment_id: string; role_id: string }[] = [];
  const organizations: Record<string, unknown>[] = [];
  const memberships: Record<string, unknown>[] = [];
  const partners: Record<string, unknown>[] = [];
  const decisions: Record<string, unknown>[] = [];
  const roles = [
    role(SYSTEM_ROLE_ID, "platform_administrator", "Platform administrator", {
      is_system: true,
      active_assignments: 1,
    }),
    role(ROLE_ID, "support_agent", "Support agent"),
  ];

  const user = () => ({
    id: USER_ID,
    email: "ana@example.com",
    username: "ana@example.com",
    first_name: "Ana",
    last_name: "Silva",
    contact: null,
    actor_type: "marketplace_staff",
    status: userStatus,
    grants: grants.map((grant) => {
      const held = roles.find((candidate) => candidate.id === grant.role_id);
      return {
        ...grant,
        role_code: held?.code ?? "",
        role_display_name: held?.display_name ?? "",
        organization_id: null,
        granted_at: "2026-09-02T10:00:00Z",
        granted_by: ADMIN_ID,
      };
    }),
  });

  const routes: [string, RegExp, (route: Route, match: RegExpMatchArray) => unknown][] = [
    ["POST /auth/login", /^\/auth\/login$/, () => ((signedIn = true), token())],
    ["POST /auth/refresh", /^\/auth\/refresh$/, () => (signedIn ? token() : 401)],
    ["POST /auth/logout", /^\/auth\/logout$/, () => ((signedIn = false), 204)],
    [
      "GET /auth/me",
      /^\/auth\/me$/,
      () => ({
        actor_id: ADMIN_ID,
        actor_type: "staff",
        organization_id: null,
        roles: ["platform_administrator"],
        permissions: PERMISSIONS,
        organization_permissions: [],
        authentication_source: "local",
        ...NO_CLIENT,
        memberships: [],
      }),
    ],
    ["GET /admin/users", /^\/admin\/users$/, () => ({ count: 1, results: [user()] })],
    ["POST /admin/users", /^\/admin\/users$/, () => [201, { id: NEW_USER_ID }]],
    ["GET /admin/users/{user_id}", /^\/admin\/users\/[^/]+$/, () => user()],
    [
      "POST /admin/users/{user_id}/disable",
      /^\/admin\/users\/[^/]+\/disable$/,
      () => ((userStatus = "disabled"), 204),
    ],
    [
      "POST /admin/users/{user_id}/reactivate",
      /^\/admin\/users\/[^/]+\/reactivate$/,
      () => ((userStatus = "active"), 204),
    ],
    [
      "POST /admin/users/{user_id}/roles",
      /^\/admin\/users\/[^/]+\/roles$/,
      (route) => {
        const { role_id } = route.request().postDataJSON() as { role_id: string };
        grants = [...grants, { assignment_id: ASSIGNMENT_ID, role_id }];
        return [201, { id: ASSIGNMENT_ID }];
      },
    ],
    [
      "POST /admin/users/{user_id}/roles/{assignment_id}/revoke",
      /^\/admin\/users\/[^/]+\/roles\/([^/]+)\/revoke$/,
      (_route, match) => {
        grants = grants.filter((grant) => grant.assignment_id !== match[1]);
        return 204;
      },
    ],
    ["GET /admin/roles", /^\/admin\/roles$/, () => roles],
    [
      "POST /admin/roles",
      /^\/admin\/roles$/,
      (route) => {
        const body = route.request().postDataJSON() as {
          code: string;
          display_name: string;
          permissions: { code: string; delegable: boolean }[];
        };
        roles.push(
          role(NEW_ROLE_ID, body.code, body.display_name, { permissions: body.permissions }),
        );
        return [201, { id: NEW_ROLE_ID }];
      },
    ],
    [
      "GET /admin/roles/{role_id}",
      /^\/admin\/roles\/([^/]+)$/,
      (_route, match) => roles.find((candidate) => candidate.id === match[1]) ?? 404,
    ],
    [
      "PUT /admin/roles/{role_id}/permissions",
      /^\/admin\/roles\/([^/]+)\/permissions$/,
      (route, match) => {
        const body = route.request().postDataJSON() as {
          permissions: { code: string; delegable: boolean }[];
        };
        const target = roles.find((candidate) => candidate.id === match[1]);
        if (!target) return 404;
        target.permissions = body.permissions;
        target.version += 1;
        return { version: target.version };
      },
    ],
    [
      "GET /admin/permissions",
      /^\/admin\/permissions$/,
      () =>
        PERMISSIONS.map((code) => ({
          code,
          display_name: code,
          description: null,
          module: "identity",
          status: "active",
          is_system: true,
          scope: "global",
        })),
    ],
    [
      "GET /admin/organizations",
      /^\/admin\/organizations$/,
      () => ({ count: organizations.length, results: organizations }),
    ],
    [
      "POST /admin/organizations",
      /^\/admin\/organizations$/,
      (route) => {
        const { name } = route.request().postDataJSON() as { name: string };
        const created = { id: ORGANIZATION_ID, name, version: 1, created_at: NOW, updated_at: NOW };
        organizations.push(created);
        return [201, created];
      },
    ],
    [
      "GET /admin/organizations/{organization_id}",
      /^\/admin\/organizations\/([^/]+)$/,
      (_route, match) => organizations.find((candidate) => candidate.id === match[1]) ?? 404,
    ],
    [
      "PUT /admin/organizations/{organization_id}",
      /^\/admin\/organizations\/([^/]+)$/,
      (route, match) => {
        const body = route.request().postDataJSON() as { name: string; expected_version: number };
        const target = organizations.find((candidate) => candidate.id === match[1]);
        if (!target) return 404;
        if (target.version !== body.expected_version) return 409;
        Object.assign(target, { name: body.name, version: body.expected_version + 1 });
        return target;
      },
    ],
    [
      "GET /admin/organizations/{organization_id}/memberships",
      /^\/admin\/organizations\/[^/]+\/memberships$/,
      () => ({ count: memberships.length, results: memberships }),
    ],
    [
      "POST /admin/organizations/{organization_id}/memberships",
      /^\/admin\/organizations\/([^/]+)\/memberships$/,
      (route, match) => {
        const { user_id } = route.request().postDataJSON() as { user_id: string };
        const created = {
          id: MEMBERSHIP_ID,
          organization_id: match[1],
          user_id,
          verified_at: NOW,
          verified_by: ADMIN_ID,
          ended_at: null,
          ended_by: null,
          created_at: NOW,
          updated_at: NOW,
        };
        memberships.push(created);
        return [201, created];
      },
    ],
    [
      "POST /admin/organizations/{organization_id}/memberships/{membership_id}/end",
      /^\/admin\/organizations\/[^/]+\/memberships\/([^/]+)\/end$/,
      (_route, match) => {
        const target = memberships.find((candidate) => candidate.id === match[1]);
        if (!target) return 404;
        Object.assign(target, { ended_at: NOW, ended_by: ADMIN_ID });
        return target;
      },
    ],
    [
      "GET /admin/partners",
      /^\/admin\/partners$/,
      () => ({ count: partners.length, next: null, previous: null, results: partners }),
    ],
    [
      "POST /admin/partners",
      /^\/admin\/partners$/,
      (route) => {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        const profile = without(body, "organization_id", "reason");
        const organization_id = body.organization_id;
        const organization = organizations.find((candidate) => candidate.id === organization_id);
        if (!organization) return 404;
        const created = {
          id: PARTNER_ID,
          organization_id,
          organization_name: organization.name,
          ...profile,
          status: "pending",
          intake_path: "assisted",
          registered_by: ADMIN_ID,
          submitted_at: NOW,
          version: 1,
          latest_decision: null,
          created_at: NOW,
          updated_at: NOW,
        };
        partners.push(created);
        return [201, created];
      },
    ],
    [
      "GET /admin/partners/{partner_id}",
      /^\/admin\/partners\/([^/]+)$/,
      (_route, match) => partners.find((candidate) => candidate.id === match[1]) ?? 404,
    ],
    [
      "PUT /admin/partners/{partner_id}",
      /^\/admin\/partners\/([^/]+)$/,
      (route, match) => {
        const target = partners.find((candidate) => candidate.id === match[1]);
        if (!target) return 404;
        const body = route.request().postDataJSON() as Record<string, unknown>;
        if (target.version !== body.expected_version) return 409;
        const profile = without(body, "expected_version", "reason");
        return Object.assign(target, profile, { version: (target.version as number) + 1 });
      },
    ],
    ...(["verify", "reject", "resubmit"] as const).map((action): (typeof routes)[number] => [
      `POST /admin/partners/{partner_id}/${action}`,
      new RegExp(`^/admin/partners/([^/]+)/${action}$`),
      (route: Route, match: RegExpMatchArray) => {
        const target = partners.find((candidate) => candidate.id === match[1]);
        if (!target) return 404;
        const { expected_version, reason } = route.request().postDataJSON() as {
          expected_version: number;
          reason: string;
        };
        if (target.version !== expected_version) return 409;
        const status = { verify: "verified", reject: "rejected", resubmit: "pending" }[action];
        if (action !== "resubmit") {
          const decision = {
            id: `00000000-0000-4000-8000-00000000020${decisions.length}`,
            outcome: status,
            partner_version: expected_version,
            reason,
            decided_by: ADMIN_ID,
            decided_at: NOW,
          };
          decisions.unshift(decision);
          target.latest_decision = decision;
        }
        return Object.assign(target, { status, version: expected_version + 1 });
      },
    ]),
    [
      "GET /admin/partners/{partner_id}/decisions",
      /^\/admin\/partners\/[^/]+\/decisions$/,
      () => ({ count: decisions.length, next: null, previous: null, results: decisions }),
    ],
  ];

  function token() {
    return { access_token: "test-access-token", token_type: "bearer", expires_in: 900 };
  }

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api\/v1/, "");
    if (await answerAmbient(route, path)) return;
    for (const [operation, pattern, handle] of routes) {
      const match = path.match(pattern);
      if (!match || !operation.startsWith(`${request.method()} `)) continue;
      calls.push({
        operation,
        body: request.postData() ? request.postDataJSON() : null,
        authorization: request.headers()["authorization"] ?? null,
        requestId: request.headers()["x-request-id"] ?? null,
      });
      const result = await handle(route, match);
      // Handlers return a body (200), a bare status, or a [status, body] pair.
      const [status, body] = isStatusPair(result)
        ? result
        : typeof result === "number"
          ? [result, result === 204 ? null : problem(result)]
          : [200, result];
      await route.fulfill({
        status,
        contentType: status >= 400 ? "application/problem+json" : "application/json",
        body: body === null ? "" : JSON.stringify(body),
      });
      return;
    }
    throw new Error(`Unexpected API call: ${request.method()} ${path}`);
  });
  return calls;
}

/** The request body without the given fields (audit/concurrency fields the fake ignores). */
function without(value: Record<string, unknown>, ...keys: string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function isStatusPair(value: unknown): value is [number, unknown] {
  return Array.isArray(value) && value.length === 2 && typeof value[0] === "number";
}

function problem(status: number) {
  return {
    type: "about:blank",
    title: "Error",
    status,
    code: status === 401 ? "AUTHENTICATION_FAILED" : "NOT_FOUND",
  };
}

function watchForViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy|Refused to/i.test(message.text())) violations.push(message.text());
  });
  page.on("pageerror", (error) => violations.push(error.message));
  return violations;
}

function lastCall(calls: Call[], operation: string): Call {
  const call = calls.findLast((candidate) => candidate.operation === operation);
  if (!call) throw new Error(`${operation} was not called`);
  return call;
}

test("every API operation is reachable from the admin UI", async ({ page }) => {
  const violations = watchForViolations(page);
  const calls = await fakeBackend(page);

  // Anonymous: the refresh cookie is absent, so the portal sends us to sign in.
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fusers$/);
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/admin\/users$/);
  expect(lastCall(calls, "POST /auth/login").body).toEqual({
    email: "admin@example.com",
    password: "correct horse battery staple",
  });

  // Invite a user: the console sends the staff actor type and the audited reason.
  await page.getByRole("button", { name: "New user" }).click();
  const invite = page.getByRole("dialog");
  await invite.getByLabel("Email").fill("bo@example.com");
  await invite.getByLabel("First name").fill("Bo");
  await invite.getByLabel("Last name").fill("Lee");
  await invite.getByLabel("Reason").fill("New support hire");
  await invite.getByRole("button", { name: "Create user" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/users/${NEW_USER_ID}$`));
  expect(lastCall(calls, "POST /admin/users").body).toEqual({
    email: "bo@example.com",
    first_name: "Bo",
    last_name: "Lee",
    contact: null,
    actor_type: "marketplace_staff",
    reason: "New support hire",
  });
  await page.getByRole("link", { name: "Users", exact: true }).first().click();

  // User detail: grant, revoke, disable, reactivate.
  await page.getByRole("link", { name: "ana@example.com" }).click();
  await expect(page.getByRole("heading", { name: "ana@example.com" })).toBeVisible();

  await page.getByRole("button", { name: "Grant role" }).click();
  await page.getByRole("combobox", { name: "Role" }).click();
  await page.getByRole("option", { name: /Support agent/ }).click();
  await page.getByLabel("Reason").fill("Joins support");
  await page.getByRole("dialog").getByRole("button", { name: "Grant role" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(lastCall(calls, "POST /admin/users/{user_id}/roles").body).toEqual({
    role_id: ROLE_ID,
    reason: "Joins support",
  });

  await page.getByRole("button", { name: "Revoke" }).click();
  await page.getByLabel("Reason").fill("Moved team");
  await page.getByRole("button", { name: "Revoke role" }).click();
  await expect(page.getByText("No roles granted")).toBeVisible();
  expect(lastCall(calls, "POST /admin/users/{user_id}/roles/{assignment_id}/revoke").body).toEqual({
    reason: "Moved team",
  });

  await page.getByRole("button", { name: "Disable account" }).click();
  await page.getByLabel("Reason").fill("Left the company");
  await page.getByRole("dialog").getByRole("button", { name: "Disable account" }).click();
  await page.getByRole("button", { name: "Reactivate account" }).click();
  await page.getByLabel("Reason").fill("Rehired");
  await page.getByRole("dialog").getByRole("button", { name: "Reactivate account" }).click();
  await expect(page.getByRole("button", { name: "Disable account" })).toBeVisible();

  // Roles: list, create, detail, edit permissions.
  await page.getByRole("link", { name: "Roles", exact: true }).first().click();
  await expect(page.getByRole("link", { name: "Support agent" })).toBeVisible();
  await page.getByRole("link", { name: "New role" }).click();
  await page.getByLabel("Code").fill("auditor");
  await page.getByLabel("Display name").fill("Auditor");
  await page.getByRole("checkbox", { name: /^identity\.user\.view/ }).click();
  await page.getByLabel("Reason").fill("Quarterly audit");
  await page.getByRole("button", { name: "Create role" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/roles/${NEW_ROLE_ID}$`));
  expect(lastCall(calls, "POST /admin/roles").body).toEqual({
    code: "auditor",
    display_name: "Auditor",
    description: null,
    permissions: [{ code: "identity.user.view", delegable: false }],
    scope: "global",
    reason: "Quarterly audit",
  });

  await page.getByRole("button", { name: "Edit permissions" }).click();
  await page.getByRole("checkbox", { name: /^identity\.role\.view/ }).click();
  await page.getByLabel("Reason").fill("Needs role visibility");
  await page.getByRole("button", { name: "Save permissions" }).click();
  await expect(page.getByRole("button", { name: "Edit permissions" })).toBeVisible();
  expect(lastCall(calls, "PUT /admin/roles/{role_id}/permissions").body).toEqual({
    version: 1,
    permissions: [
      { code: "identity.user.view", delegable: false },
      { code: "identity.role.view", delegable: false },
    ],
    reason: "Needs role visibility",
  });

  // Organizations: create, rename with the loaded version, verify and end a membership.
  await page.getByRole("link", { name: "Organizations", exact: true }).first().click();
  await expect(page.getByText("No organizations found")).toBeVisible();
  await page.getByRole("button", { name: "New organization" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill("Acme");
  await page.getByRole("dialog").getByLabel("Reason").fill("Onboarding");
  await page.getByRole("dialog").getByRole("button", { name: "Create organization" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/organizations/${ORGANIZATION_ID}$`));
  expect(lastCall(calls, "POST /admin/organizations").body).toEqual({
    name: "Acme",
    reason: "Onboarding",
  });

  await page.getByRole("button", { name: "Rename" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill("Acme Nepal");
  await page.getByRole("dialog").getByLabel("Reason").fill("Legal name");
  await page.getByRole("dialog").getByRole("button", { name: "Rename" }).click();
  await expect(page.getByRole("heading", { name: "Acme Nepal" })).toBeVisible();
  expect(lastCall(calls, "PUT /admin/organizations/{organization_id}").body).toEqual({
    name: "Acme Nepal",
    reason: "Legal name",
    expected_version: 1,
  });

  await page.getByRole("button", { name: "Verify member" }).click();
  await page.getByRole("dialog").getByLabel("User ID").fill(USER_ID);
  await page.getByRole("dialog").getByLabel("Reason").fill("Portal operator");
  await page.getByRole("dialog").getByRole("button", { name: "Verify member" }).click();
  await expect(page.getByRole("link", { name: USER_ID })).toBeVisible();
  expect(lastCall(calls, "POST /admin/organizations/{organization_id}/memberships").body).toEqual({
    user_id: USER_ID,
    reason: "Portal operator",
  });

  await page.getByRole("button", { name: "End", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Reason").fill("Left the team");
  await page.getByRole("dialog").getByRole("button", { name: "End membership" }).click();
  // The status badge, not the "Ended" column header.
  await expect(page.getByRole("main").getByTitle("Membership was ended")).toBeVisible();
  expect(
    lastCall(calls, "POST /admin/organizations/{organization_id}/memberships/{membership_id}/end")
      .body,
  ).toEqual({ reason: "Left the team" });

  // Partners: assisted registration from the organization, edit, reject, resubmit, verify.
  await page.getByRole("link", { name: "Register as partner" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/admin/partners/new\\?organization=${ORGANIZATION_ID}$`),
  );
  await page.getByLabel("Business name").fill("Acme Coffee");
  await page.getByLabel("Contact person").fill("Sita Sharma");
  await page.getByLabel("Contact email").fill("partners@acme.example");
  await page.getByLabel("Reason").fill("Onboarding desk");
  await page.getByRole("button", { name: "Register partner" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/partners/${PARTNER_ID}$`));
  expect(lastCall(calls, "POST /admin/partners").body).toEqual({
    business_name: "Acme Coffee",
    category: "",
    description: "",
    contact_name: "Sita Sharma",
    contact_email: "partners@acme.example",
    contact_phone: "",
    website: "",
    reason: "Onboarding desk",
    organization_id: ORGANIZATION_ID,
    source: "partner_organization",
  });

  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Website (optional)").fill("https://acme.example");
  await page.getByLabel("Reason").fill("Partner sent their website");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("link", { name: "https://acme.example" })).toBeVisible();
  expect(lastCall(calls, "PUT /admin/partners/{partner_id}").body).toMatchObject({
    website: "https://acme.example",
    reason: "Partner sent their website",
    expected_version: 1,
  });

  await page.getByRole("button", { name: "Reject" }).click();
  await page.getByRole("dialog").getByLabel("Reason").fill("Registration number mismatch");
  await page.getByRole("dialog").getByRole("button", { name: "Reject registration" }).click();
  await expect(page.getByRole("main").getByText("Registration rejected")).toBeVisible();
  expect(lastCall(calls, "POST /admin/partners/{partner_id}/reject").body).toEqual({
    reason: "Registration number mismatch",
    expected_version: 2,
  });

  await page.getByRole("button", { name: "Resubmit for review" }).click();
  await page.getByRole("dialog").getByLabel("Reason").fill("Partner fixed it by phone");
  await page.getByRole("dialog").getByRole("button", { name: "Resubmit" }).click();
  await page.getByRole("button", { name: "Verify" }).click();
  await page.getByRole("dialog").getByLabel("Reason").fill("Documents checked");
  await page.getByRole("dialog").getByRole("button", { name: "Verify partner" }).click();
  await expect(page.getByRole("main").getByText("Verified partner")).toBeVisible();
  expect(lastCall(calls, "POST /admin/partners/{partner_id}/verify").body).toEqual({
    reason: "Documents checked",
    expected_version: 4,
  });
  await expect(page.getByRole("cell", { name: "Registration number mismatch" })).toBeVisible();

  await page.getByRole("link", { name: "Partners", exact: true }).first().click();
  await expect(page.getByRole("link", { name: "Acme Coffee" })).toBeVisible();

  await page.getByRole("link", { name: "Permissions", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Permissions" })).toBeVisible();

  // A reload loses the in-memory token; the refresh cookie restores the session.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Permissions" })).toBeVisible();

  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  const served = new Set(calls.map((call) => call.operation));
  expect([...ALL_OPERATIONS].filter((operation) => !served.has(operation))).toEqual([]);

  // Every data call carries the bearer token; login and refresh run before one exists and
  // rely on the httpOnly cookie. Every call carries a correlation id.
  for (const call of calls) {
    if (/^POST \/auth\/(login|refresh)$/.test(call.operation)) {
      expect(call.authorization, call.operation).toBeNull();
    } else if (call.operation !== "POST /auth/logout") {
      expect(call.authorization, call.operation).toBe("Bearer test-access-token");
    }
    expect(call.requestId, call.operation).toBeTruthy();
  }
  expect(violations).toEqual([]);
});

test("the document carries a nonce-based Content-Security-Policy", async ({ page }) => {
  const response = await page.goto("/login");
  const policy = response?.headers()["content-security-policy"] ?? "";
  expect(policy).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("object-src 'none'");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["cross-origin-opener-policy"]).toBe("same-origin");

  // Two requests never share a nonce.
  const again = await page.request.get("/login");
  expect(again.headers()["content-security-policy"]).not.toBe(policy);
});

test("an id that is not a UUID never reaches the API", async ({ page }) => {
  const calls = await fakeBackend(page, { signedIn: true });
  await page.goto("/admin/users/..%2F..%2Fauth%2Flogout");
  await expect(page.getByText("Page not found")).toBeVisible();
  // Only the session restore ran; nothing was sent for the bogus id.
  expect(calls.map((call) => call.operation).sort()).toEqual([
    "GET /auth/me",
    "POST /auth/refresh",
  ]);
});

test("an invited user sets a password from the emailed link", async ({ page }) => {
  const posted: unknown[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/auth/refresh") {
      await route.fulfill({ status: 401, contentType: "application/problem+json", body: "{}" });
    } else if (path === "/api/v1/users/auth/password-setup/MQ/abc123-def456/") {
      if (request.method() === "POST") posted.push(request.postDataJSON());
      const body = request.method() === "GET" ? { valid: true } : { message: "Password set." };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    } else {
      throw new Error(`Unexpected API call: ${request.method()} ${path}`);
    }
  });

  await page.goto("/set-password/MQ/abc123-def456");
  await page.getByLabel("New password").fill("a long passphrase");
  await page.getByLabel("Repeat password").fill("a different one");
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(page.getByText("The passwords do not match")).toBeVisible();
  expect(posted).toEqual([]);

  await page.getByLabel("Repeat password").fill("a long passphrase");
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(page.getByText("Password set", { exact: true })).toBeVisible();
  expect(posted).toEqual([
    { password: "a long passphrase", confirm_password: "a long passphrase" },
  ]);
});
