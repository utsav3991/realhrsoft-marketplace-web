import { expect, test, type Page } from "@playwright/test";

/**
 * Employer and Partner portals (ADR-014) against a small stateful fake of /api/v1. Checks that
 * portal calls carry X-Organization-ID for the selected organization, that registration and
 * administration never do, and that the UI never sends ownership or audience fields.
 */

const USER_ID = "00000000-0000-4000-8000-000000000001";
const ACME = "00000000-0000-4000-8000-0000000000a1";
const BENEFIT_ID = "00000000-0000-4000-8000-0000000000b1";
const OPTION_ID = "00000000-0000-4000-8000-0000000000b2";
const OFFER_ID = "00000000-0000-4000-8000-0000000000c1";
const PARTNER_ID = "00000000-0000-4000-8000-0000000000d1";
const NOW = "2026-09-24T10:00:00Z";

const EMPLOYER_CODES = [
  "organizations.employer_profile.view",
  "employer_benefits.benefit.view",
  "employer_benefits.benefit.create",
  "employer_benefits.benefit.edit",
  "employer_benefits.benefit.publish",
  "employer_benefits.benefit.pause",
  "employer_benefits.benefit.retire",
];
const APPLICANT_CODES = [
  "organizations.partner.create",
  "organizations.partner.read_own",
  "organizations.partner.update_own",
  "organizations.partner_contact.manage_own",
  "organizations.partner_location.manage_own",
  "organizations.partner_document.manage_own",
  "organizations.partner_verification.submit",
];
const PARTNER_CODES = [
  "organizations.partner_profile.view",
  "organizations.partner_profile.edit",
  "commercial.entitlement.view",
  "offers.offer.view",
  "offers.offer.create",
  "offers.offer.edit",
  "offers.offer.submit",
  "offers.offer.withdraw",
];

interface Call {
  operation: string;
  body: unknown;
  query: string;
  organization: string | null;
}

type Capacity = "employer" | "partner" | "none";

async function fakeBackend(page: Page, capacity: Capacity): Promise<Call[]> {
  const calls: Call[] = [];
  let signedIn = false;
  let benefit: Record<string, unknown> | null = null;
  let offer: Record<string, unknown> | null = null;
  let registration: {
    profile: Record<string, unknown>;
    verification: Record<string, unknown>;
  } | null = null;

  const codes = capacity === "employer" ? EMPLOYER_CODES : PARTNER_CODES;
  const memberships =
    capacity === "none"
      ? []
      : [
          {
            organization_id: ACME,
            name: "Acme",
            employer: capacity === "employer",
            partner: capacity === "partner",
          },
        ];

  function me(organization: string | null) {
    // The backend refuses an organization without membership and grants there.
    if (organization && (capacity === "none" || organization !== ACME)) return 403;
    return {
      actor_id: USER_ID,
      actor_type: "partner",
      organization_id: organization,
      roles: [],
      // An account without a Partner organization holds the applicant grants (global).
      permissions: capacity === "none" ? APPLICANT_CODES : [],
      organization_permissions: organization ? codes : [],
      authentication_source: "local",
      memberships,
    };
  }

  function version(record: Record<string, unknown>) {
    record.version = (record.version as number) + 1;
    return { version: record.version };
  }

  const publication = () => ({
    live: false,
    blockers:
      offer?.status === "approved"
        ? ["commercially_ineligible"]
        : ["commercially_ineligible", "content_not_approved"],
  });

  const routes: [string, RegExp, (body: Record<string, unknown>, org: string | null) => unknown][] =
    [
      ["POST /auth/login", /^\/auth\/login$/, () => ((signedIn = true), token())],
      ["POST /auth/refresh", /^\/auth\/refresh$/, () => (signedIn ? token() : 401)],
      ["GET /auth/me", /^\/auth\/me$/, (_, org) => me(org)],
      [
        "GET /employer/benefits",
        /^\/employer\/benefits$/,
        () => ({ items: benefit ? [benefit] : [], next_cursor: null }),
      ],
      [
        "POST /employer/benefits",
        /^\/employer\/benefits$/,
        (body) => {
          benefit = {
            id: BENEFIT_ID,
            organization_id: ACME,
            terms: null,
            valid_from: null,
            valid_until: null,
            usage_limit_per_employee: null,
            benefit_type: "other",
            usage_instructions: null,
            external_url: null,
            contact: null,
            ...body,
            options: [],
            audience: "own_employees",
            status: "draft",
            version: 1,
            created_at: NOW,
            updated_at: NOW,
            published_at: null,
            paused_at: null,
            retired_at: null,
          };
          return [201, { id: BENEFIT_ID }];
        },
      ],
      [
        "GET /employer/benefits/{benefit_id}",
        /^\/employer\/benefits\/[^/]+$/,
        () => benefit ?? 404,
      ],
      [
        "POST /employer/benefits/{benefit_id}/publish",
        /^\/employer\/benefits\/[^/]+\/publish$/,
        () => {
          if (!benefit) return 404;
          benefit.status = "active";
          benefit.published_at = NOW;
          return version(benefit);
        },
      ],
      [
        "POST /employer/benefits/{benefit_id}/pause",
        /^\/employer\/benefits\/[^/]+\/pause$/,
        () => {
          if (!benefit) return 404;
          benefit.status = "paused";
          benefit.paused_at = NOW;
          return version(benefit);
        },
      ],
      [
        "POST /employer/benefits/{benefit_id}/resume",
        /^\/employer\/benefits\/[^/]+\/resume$/,
        () => {
          if (!benefit) return 404;
          benefit.status = "active";
          benefit.paused_at = null;
          return version(benefit);
        },
      ],
      [
        "POST /employer/benefits/{benefit_id}/options",
        /^\/employer\/benefits\/[^/]+\/options$/,
        ({ version: _version, ...fields }) => {
          if (!benefit) return 404;
          benefit.options = [
            {
              id: OPTION_ID,
              description: null,
              value: null,
              sort_order: 0,
              ...fields,
              is_active: true,
            },
          ];
          return [201, { id: OPTION_ID, ...version(benefit) }];
        },
      ],
      [
        "DELETE /employer/benefits/{benefit_id}/options/{option_id}",
        /^\/employer\/benefits\/[^/]+\/options\/[^/]+$/,
        () => {
          if (!benefit) return 404;
          benefit.options = [];
          return version(benefit);
        },
      ],
      ["GET /partner/registration", /^\/partner\/registration$/, () => registration ?? 404],
      [
        "POST /partner/registration",
        /^\/partner\/registration$/,
        (body) => {
          registration = {
            profile: {
              partner_id: PARTNER_ID,
              organization_id: null,
              legal_business_name: body.legal_name,
              display_name: body.display_name,
              registration_number: body.registration_number,
              tax_identifier: null,
              website: null,
              description: null,
              verification_status: "draft",
              operational_status: "active",
              marketplace_eligible: false,
              created_at: NOW,
              updated_at: NOW,
              version: 1,
              contacts: [],
              locations: [],
            },
            verification: {
              partner_id: PARTNER_ID,
              verification_status: "draft",
              submitted_at: null,
              review_started_at: null,
              decision_applied_at: null,
              decision_reference: null,
              review_note: null,
              requirements: [],
              documents: [],
            },
          };
          return [201, { id: PARTNER_ID }];
        },
      ],
      [
        "POST /partner/registration/{partner_id}/contacts",
        /^\/partner\/registration\/[^/]+\/contacts$/,
        ({ version: _version, primary: _primary, ...contact }) => {
          if (!registration) return 404;
          const profile = registration.profile;
          profile.contacts = [{ id: OPTION_ID, is_primary: true, ...contact }];
          return [201, { id: OPTION_ID, ...version(profile) }];
        },
      ],
      [
        "POST /partner/registration/{partner_id}/submit",
        /^\/partner\/registration\/[^/]+\/submit$/,
        () => {
          if (!registration) return 404;
          registration.profile.verification_status = "submitted";
          registration.verification.verification_status = "submitted";
          registration.verification.submitted_at = NOW;
          return version(registration.profile);
        },
      ],
      [
        "GET /partner/offers",
        /^\/partner\/offers$/,
        () => ({
          items: offer ? [{ ...offer, publication: publication() }] : [],
          next_cursor: null,
        }),
      ],
      [
        "POST /partner/offers",
        /^\/partner\/offers$/,
        (body) => {
          offer = {
            id: OFFER_ID,
            organization_id: ACME,
            terms: null,
            valid_from: null,
            valid_until: null,
            ...body,
            status: "draft",
            version: 1,
            created_at: NOW,
            updated_at: NOW,
            submitted_at: null,
            last_review: null,
          };
          return [201, { id: OFFER_ID }];
        },
      ],
      [
        "GET /partner/offers/{offer_id}",
        /^\/partner\/offers\/[^/]+$/,
        () => (offer ? { ...offer, publication: publication() } : 404),
      ],
      [
        "POST /partner/offers/{offer_id}/submit",
        /^\/partner\/offers\/[^/]+\/submit$/,
        () => {
          if (!offer) return 404;
          offer.status = "submitted";
          offer.submitted_at = NOW;
          return version(offer);
        },
      ],
    ];

  function token() {
    return { access_token: "test-access-token", token_type: "bearer", expires_in: 900 };
  }

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api\/v1/, "");
    const organization = request.headers()["x-organization-id"] ?? null;
    for (const [operation, pattern, handle] of routes) {
      if (!pattern.test(path) || !operation.startsWith(`${request.method()} `)) continue;
      const body = request.postData() ? (request.postDataJSON() as Record<string, unknown>) : {};
      const query = new URL(request.url()).search;
      calls.push({ operation, body: request.postData() ? body : null, query, organization });
      const result = handle(body, organization);
      const [status, payload] = Array.isArray(result)
        ? (result as [number, unknown])
        : typeof result === "number"
          ? [result, { type: "about:blank", title: "Error", status: result, code: "FORBIDDEN" }]
          : [200, result];
      await route.fulfill({
        status,
        contentType: status >= 400 ? "application/problem+json" : "application/json",
        body: JSON.stringify(payload),
      });
      return;
    }
    throw new Error(`Unexpected API call: ${request.method()} ${path}`);
  });
  return calls;
}

async function signIn(page: Page, path: string) {
  await page.goto(path);
  await page.getByLabel("Email").fill("member@acme.example");
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Sign in" }).click();
}

function watchForErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("an Employer member manages benefits for the selected organization", async ({ page }) => {
  const errors = watchForErrors(page);
  const calls = await fakeBackend(page, "employer");
  await signIn(page, "/employer");

  // The only Employer organization is selected automatically.
  await expect(page.getByRole("heading", { name: "Company benefits" })).toBeVisible();
  await expect(page.getByText("No benefits yet")).toBeVisible();

  await page.getByRole("link", { name: "New benefit" }).click();
  await expect(page).toHaveURL(/\/employer\/benefits\/new$/);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Title").fill("Gym membership");
  await page.getByLabel("Description").fill("Free gym access for staff.");
  await page.getByLabel("How to use it").fill("Show your staff card at reception.");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(new RegExp(`/employer/benefits/${BENEFIT_ID}$`));

  const created = calls.findLast((call) => call.operation === "POST /employer/benefits");
  expect(created?.body).toEqual({
    title: "Gym membership",
    benefit_type: "other",
    description: "Free gym access for staff.",
    usage_instructions: "Show your staff card at reception.",
    terms: null,
    external_url: null,
    valid_from: null,
    valid_until: null,
    usage_limit_per_employee: null,
    contact: null,
  });

  await page.getByRole("button", { name: "Publish" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  const published = calls.findLast((call) => call.operation.endsWith("/publish"));
  expect(published?.body).toEqual({ version: 1 });

  // Pause hides the benefit from employees; resume shows it again (ADR-015).
  await page.getByRole("button", { name: "Pause" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  expect(calls.findLast((c) => c.operation.endsWith("/pause"))?.body).toEqual({ version: 2 });
  expect(calls.findLast((c) => c.operation.endsWith("/resume"))?.body).toEqual({ version: 3 });

  // Options are part of the benefit and carry its loaded version.
  await page.getByRole("button", { name: "Add option" }).click();
  const optionDialog = page.getByRole("dialog");
  await optionDialog.getByLabel("Name").fill("Premium");
  await optionDialog.getByLabel("Value").fill("Pool included");
  await optionDialog.getByRole("button", { name: "Add option" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("cell", { name: "Pool included" })).toBeVisible();
  const added = calls.findLast((c) => c.operation.endsWith("/options"));
  expect(added?.body).toEqual({
    name: "Premium",
    value: "Pool included",
    description: null,
    sort_order: 0,
    version: 4,
  });

  await page.getByRole("button", { name: "Remove option Premium" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("No options.")).toBeVisible();
  const removed = calls.findLast((c) => c.operation.startsWith("DELETE "));
  expect(removed?.query).toBe("?version=5");

  for (const call of calls.filter((c) => c.operation.includes(" /employer/"))) {
    expect(call.organization, call.operation).toBe(ACME);
  }
  expect(errors).toEqual([]);
});

test("an applicant registers a Partner and submits it without any organization scope", async ({
  page,
}) => {
  const errors = watchForErrors(page);
  const calls = await fakeBackend(page, "none");
  await signIn(page, "/partner");

  await expect(page.getByText("Become a marketplace Partner")).toBeVisible();
  await page.getByRole("link", { name: "Register or check your registration" }).click();
  await page.getByLabel("Legal business name").fill("Acme Travel Pvt Ltd");
  await page.getByLabel("Display name").fill("Acme Travel");
  await page.getByLabel("Registration number").fill("REG-1");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByRole("button", { name: /Business details/ })).toHaveAttribute(
    "aria-current",
    "step",
  );

  await page.getByRole("button", { name: /Contacts/ }).click();
  await page.getByRole("button", { name: "Add contact" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Sita Sharma");
  await dialog.getByLabel("Email").fill("sita@acme.example");
  await dialog.getByRole("button", { name: "Add contact" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("cell", { name: "sita@acme.example" })).toBeVisible();
  const added = calls.findLast((c) => c.operation.endsWith("/contacts"));
  expect(added?.body).toEqual({
    name: "Sita Sharma",
    title: null,
    email: "sita@acme.example",
    phone: null,
    primary: false,
    version: 1,
  });

  await page.getByRole("button", { name: /Review and submit/ }).click();
  await page.getByRole("button", { name: "Submit for verification" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Submitted. Aayulogic will review your registration.")).toBeVisible();
  expect(calls.findLast((c) => c.operation.endsWith("/submit"))?.body).toEqual({ version: 2 });

  for (const call of calls.filter((c) => c.operation.includes("/partner/registration"))) {
    expect(call.organization, call.operation).toBeNull();
  }
  expect(errors).toEqual([]);
});

test("a Partner drafts an offer and submits it for review; it stays offline", async ({ page }) => {
  const errors = watchForErrors(page);
  const calls = await fakeBackend(page, "partner");
  await signIn(page, "/partner/offers");

  await page.getByRole("link", { name: "New offer" }).click();
  await expect(page).toHaveURL(/\/partner\/offers\/new$/);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Title").fill("20% off flights");
  await page.getByLabel("Category").fill("travel");
  await page.getByLabel("Description").fill("Discount on domestic flights.");
  await page.getByLabel("How to redeem").fill("Use code HR20 at checkout.");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(new RegExp(`/partner/offers/${OFFER_ID}$`));

  const created = calls.findLast((call) => call.operation === "POST /partner/offers");
  expect(created?.body).toMatchObject({ audience: "all_eligible_users" });
  expect(created?.body).not.toHaveProperty("organization_id");
  await expect(page.getByText("No active commercial entitlement.")).toBeVisible();

  await page.getByRole("button", { name: "Submit for review" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(calls.findLast((call) => call.operation.endsWith("/submit"))?.body).toEqual({
    version: 1,
  });

  for (const call of calls.filter((c) => c.operation.includes(" /partner/offers"))) {
    expect(call.organization, call.operation).toBe(ACME);
  }
  expect(errors).toEqual([]);
});
