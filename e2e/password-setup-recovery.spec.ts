import { expect, test, type Page } from "@playwright/test";

import { NO_CLIENT, answerAmbient } from "./fakes";

/**
 * Recovering an expired or lost set-password link: the public "send me a new link" form
 * (same acknowledgement whatever the account, a distinct message only when rate limited)
 * and the administrator's resend, shown only with its permission while setup is pending.
 */

const API = "/api/v1";
const ADMIN_ID = "00000000-0000-4000-8000-00000000000a";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const ACK = "Check your email";

interface Recorded {
  operation: string;
  body: unknown;
}

function json(status: number, body: unknown) {
  return {
    status,
    contentType: status >= 400 ? "application/problem+json" : "application/json",
    body: JSON.stringify(body),
  };
}

/** The public resend endpoint: answers 202 (or ``throttled`` status) and records bodies. */
async function fakePublic(page: Page, { throttled = false } = {}): Promise<Recorded[]> {
  const calls: Recorded[] = [];
  await page.route(`**${API}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.slice(API.length);
    if (path === "/auth/refresh") {
      await route.fulfill(json(401, { status: 401, code: "AUTHENTICATION_FAILED" }));
    } else if (path === "/users/auth/password-setup/MQ/expired-token/") {
      await route.fulfill(
        json(200, { valid: false, message: "This link is invalid or has expired." }),
      );
    } else if (path === "/users/auth/password-setup/resend/" && request.method() === "POST") {
      calls.push({ operation: "POST resend", body: request.postDataJSON() });
      await route.fulfill(
        throttled
          ? json(429, { title: "Too many requests", status: 429, code: "RATE_LIMITED" })
          : json(202, {
              message:
                "If an account with this email still needs a password, we have sent it a new setup link.",
            }),
      );
    } else {
      throw new Error(`Unexpected API call: ${request.method()} ${path}`);
    }
  });
  return calls;
}

test("an expired link offers a new one", async ({ page }) => {
  const calls = await fakePublic(page);
  await page.goto("/set-password/MQ/expired-token");
  await expect(page.getByText("This link cannot be used")).toBeVisible();
  await page.getByLabel("Email").fill("Group-HR@acme.example");
  await page.getByRole("button", { name: "Send me a new link" }).click();
  await expect(page.getByText(ACK)).toBeVisible();
  expect(calls).toEqual([{ operation: "POST resend", body: { email: "Group-HR@acme.example" } }]);
});

test("the same acknowledgement for known and unknown emails", async ({ page }) => {
  const calls = await fakePublic(page);
  const seen: string[] = [];
  for (const email of ["known@acme.example", "nobody@acme.example"]) {
    await page.goto("/set-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send me a new link" }).click();
    const ack = page.getByRole("alert").filter({ hasText: ACK });
    await expect(ack).toBeVisible();
    seen.push((await ack.textContent()) ?? "");
  }
  expect(new Set(seen).size).toBe(1);
  expect(calls).toHaveLength(2);
});

test("sign in links to account setup", async ({ page }) => {
  await fakePublic(page);
  await page.goto("/login");
  await page.getByRole("link", { name: "Set up your account" }).click();
  await expect(page).toHaveURL(/\/set-password$/);
  await expect(page.getByRole("button", { name: "Send me a new link" })).toBeVisible();
});

test("a throttled request says to try later", async ({ page }) => {
  await fakePublic(page, { throttled: true });
  await page.goto("/set-password");
  await page.getByLabel("Email").fill("known@acme.example");
  await page.getByRole("button", { name: "Send me a new link" }).click();
  await expect(page.getByText("Too many requests. Try again later.")).toBeVisible();
  await expect(page.getByText(ACK)).toHaveCount(0);
});

/** A signed-in administrator holding ``permissions``, looking at a user without a password. */
async function fakeAdmin(page: Page, permissions: string[]): Promise<Recorded[]> {
  const calls: Recorded[] = [];
  await page.route(`**${API}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.slice(API.length);
    if (await answerAmbient(route, path)) return;
    const operation = `${request.method()} ${path}`;
    if (operation === "POST /auth/refresh") {
      await route.fulfill(json(200, { access_token: "t", token_type: "bearer", expires_in: 900 }));
    } else if (operation === "GET /auth/me") {
      await route.fulfill(
        json(200, {
          actor_id: ADMIN_ID,
          actor_type: "marketplace_staff",
          organization_id: null,
          roles: [],
          permissions,
          organization_permissions: [],
          authentication_source: "local",
          ...NO_CLIENT,
          memberships: [],
        }),
      );
    } else if (operation === `GET /admin/users/${USER_ID}`) {
      await route.fulfill(
        json(200, {
          id: USER_ID,
          email: "new.admin@acme.example",
          username: "new-admin",
          first_name: "Sita",
          last_name: "Sharma",
          contact: null,
          actor_type: "employer",
          status: "active",
          password_setup_pending: true,
          grants: [],
        }),
      );
    } else if (operation === `POST /admin/users/${USER_ID}/password-setup/resend`) {
      calls.push({ operation: "POST resend", body: request.postDataJSON() });
      await route.fulfill({ status: 204, body: "" });
    } else {
      throw new Error(`Unexpected API call: ${operation}`);
    }
  });
  return calls;
}

test("administrators resend a pending setup link", async ({ page }) => {
  const calls = await fakeAdmin(page, [
    "identity.user.view",
    "identity.user.password_setup.resend",
  ]);
  await page.goto(`/admin/users/${USER_ID}`);
  await page.getByRole("button", { name: "Resend setup link" }).click();
  await page.getByLabel("Reason").fill("The link expired");
  await page.getByRole("button", { name: "Resend link" }).click();
  await expect(page.getByText("Sent a new setup link to new.admin@acme.example")).toBeVisible();
  expect(calls).toEqual([{ operation: "POST resend", body: { reason: "The link expired" } }]);
});

test("the resend action needs its permission", async ({ page }) => {
  await fakeAdmin(page, ["identity.user.view"]);
  await page.goto(`/admin/users/${USER_ID}`);
  await expect(page.getByText("Not set yet (setup link pending)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resend setup link" })).toHaveCount(0);
});
