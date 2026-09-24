import { expect, test, type Page, type Route } from "@playwright/test";

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

const PERMISSIONS = [
  "identity.user.view",
  "identity.user.disable",
  "identity.user.reactivate",
  "identity.role.view",
  "identity.role.create",
  "identity.role_permission.manage",
  "identity.role.assign",
  "identity.role.revoke",
  "identity.permission.view",
];

const ALL_OPERATIONS = [
  "POST /auth/login",
  "POST /auth/refresh",
  "POST /auth/logout",
  "GET /auth/me",
  "GET /admin/users",
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
    actor_type: "staff",
    status: userStatus,
    created_at: "2026-09-01T10:00:00Z",
    disabled_at: userStatus === "disabled" ? "2026-09-20T10:00:00Z" : null,
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
        memberships: [],
      }),
    ],
    ["GET /admin/users", /^\/admin\/users$/, () => ({ items: [user()], next_cursor: null })],
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
  ];

  function token() {
    return { access_token: "test-access-token", token_type: "bearer", expires_in: 900 };
  }

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api\/v1/, "");
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
