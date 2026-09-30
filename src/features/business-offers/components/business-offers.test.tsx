import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EMPTY_BENEFIT_VALUE } from "@/features/offers/schemas/benefit-value";
import { ApiError, makeQueryClient, setActiveOrganizationId, type Schemas } from "@/shared/api";
import { SessionContext, type CurrentActor, type SessionValue } from "@/shared/auth";
import {
  BusinessOfferPermission,
  OfferAdminPermission,
  type PermissionCode,
} from "@/shared/authorization";
import { applyApiFieldErrors } from "@/shared/forms/api-field-errors";

import {
  BUSINESS_OFFER_FIELDS,
  businessOfferBody,
  businessOfferSchema,
  EMPTY_BUSINESS_OFFER,
  type BusinessOfferValues,
} from "../schemas/business-offer";
import { AdminBusinessOffer } from "./admin-business-offers";
import { BusinessCatalogueOffer } from "./business-catalogue";
import { Lead } from "./enquiries";
import { OwnBusinessOffer } from "./own-business-offers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const OFFER_ID = "1d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f5a";
const VERSION_ID = "2e3f4a5b-6c7d-4e8f-9a0b-1c2d3e4f5a6b";
const SELLER = "4a293c96-2952-43ac-bf39-bdfda7531c48";
const BUYER = "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b";
const ENQUIRY_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const USER = "9d31c4aa-1f99-4c90-b748-e00893786136";
const CATEGORY = { id: "2f6f4c1e-8a4b-4d51-9d4e-5f1c2b7a9e10", name: "Health", slug: "health" };

function version(
  state: Schemas["OfferVersionStateEnum"],
  showToEmployees: boolean,
): Schemas["OfferVersion"] {
  return {
    id: VERSION_ID,
    number: 1,
    state,
    title: "Corporate wellness packages",
    headline: "30% off annual gym memberships for your staff",
    description: "Bulk memberships at every branch.",
    terms: "",
    valid_from: "2026-10-01T00:00:00Z",
    valid_until: showToEmployees ? "2027-03-31T00:00:00Z" : null,
    fulfillment_mode: showToEmployees ? "voucher_confirmation" : "enquiry",
    benefit: { schema_version: 1, type: "percentage", description: "", percent: "30" },
    marketplace_policy: showToEmployees
      ? {
          category: { ...CATEGORY, is_active: true },
          audience_type: "all_eligible_users",
          audience_organizations: [],
          presentation_method: "in_store",
          promo_code: "",
          redemption_url: "",
          redemption_instructions: "Show the voucher at the desk.",
          custom_method_name: "",
          acceptance_mode: "auto_accept",
          approval_ttl_hours: null,
        }
      : null,
    benefit_policy: null,
    business_policy: {
      category: { ...CATEGORY, is_active: true },
      audience_type: "all_businesses",
      audience_organizations: [],
      show_to_employees: showToEmployees,
      enquiry_instructions: "Tell us your headcount.",
    },
    edit_count: 1,
    frozen_at: state === "draft" ? null : "2026-09-30T10:00:00Z",
    frozen_by: null,
    submitted_at: state === "in_review" ? "2026-09-30T10:00:00Z" : null,
    submitted_by: null,
    created_by: USER,
    created_at: "2026-09-30T09:00:00Z",
    updated_at: "2026-09-30T10:00:00Z",
  };
}

function offer(
  state: Schemas["OfferVersionStateEnum"],
  { asPartner = true, showToEmployees = false } = {},
): Schemas["Offer"] {
  return {
    id: OFFER_ID,
    kind: "business_offer",
    provider_organization: { id: SELLER, name: "Fitness Hub Pvt. Ltd." },
    partner: asPartner
      ? {
          id: "0b0b5e3c-3c3f-4bd6-9a55-8f3b7f0a8f2e",
          organization_id: SELLER,
          business_name: "Fitness Hub",
          status: "verified",
          source: "partner_organization",
        }
      : null,
    posted_via: asPartner ? "partner_portal" : "employer_portal",
    availability: "enabled",
    is_featured: false,
    version: 3,
    display_status: state === "in_review" ? "in_review" : "draft",
    visible_to_employees: false,
    visible_to_businesses: false,
    current_version: null,
    working_version: version(state, showToEmployees),
    first_published_at: null,
    suspended_at: null,
    suspended_by: null,
    suspension_reason: "",
    retired_at: null,
    retired_by: null,
    latest_decision: null,
    created_by: USER,
    updated_by: USER,
    created_at: "2026-09-30T09:00:00Z",
    updated_at: "2026-09-30T10:00:00Z",
  };
}

const card: Schemas["BusinessCatalogueOffer"] = {
  id: OFFER_ID,
  version_id: VERSION_ID,
  version_number: 1,
  title: "Corporate wellness packages",
  headline: "30% off annual gym memberships for your staff",
  description: "Bulk memberships at every branch.",
  terms: "",
  valid_from: "2026-10-01T00:00:00Z",
  valid_until: null,
  benefit: { schema_version: 1, type: "percentage", description: "", percent: "30" },
  provider_organization: { id: SELLER, name: "Fitness Hub Pvt. Ltd." },
  partner: { id: "0b0b5e3c-3c3f-4bd6-9a55-8f3b7f0a8f2e", business_name: "Fitness Hub" },
  category: CATEGORY,
  enquiry_instructions: "Tell us your headcount.",
  shown_to_employees: false,
  my_open_enquiry_id: null,
};

const enquiry: Schemas["BusinessEnquiry"] = {
  id: ENQUIRY_ID,
  offer: {
    id: OFFER_ID,
    version_id: VERSION_ID,
    version_number: 1,
    title: card.title,
    headline: card.headline,
    provider_organization: card.provider_organization,
  },
  organization: { id: BUYER, name: "Everest Bank Ltd." },
  enquirer_id: USER,
  message: "120 memberships, please.",
  contact_name: "Sita Sharma",
  contact_email: "hr@everestbank.example",
  contact_phone: "",
  status: "open",
  closed_at: null,
  closed_by: null,
  closing_note: "",
  created_at: "2026-10-02T09:00:00Z",
  updated_at: "2026-10-02T09:00:00Z",
};

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" },
  });
}

const page = (results: unknown[]) => ({ count: results.length, next: null, previous: null, results });

/** GETs answer with `record`; lists, categories and history with one-item pages. */
function serve(record: unknown) {
  fetchMock.mockImplementation(async (request) => {
    const path = new URL(request.url).pathname;
    if (path.endsWith("/decisions") || path.endsWith("/versions")) return json(page([]));
    if (path.includes("offer-categories")) return json([{ ...CATEGORY, description: "", sort_order: 0 }]);
    if (request.method === "GET") return json(record);
    return json(record, path.endsWith("/enquire") ? 201 : 200);
  });
}

function actor(
  permissions: PermissionCode[],
  organization: string | null,
  membership?: { employer: boolean; partner: boolean },
): CurrentActor {
  return {
    id: "user-1",
    actorType: "staff",
    authenticationSource: "local",
    roles: [],
    globalPermissions: organization ? new Set() : new Set(permissions),
    organization: organization ? { id: organization, permissions: new Set(permissions) } : null,
    memberships:
      organization && membership
        ? [{ organizationId: organization, name: "Org", ...membership }]
        : [],
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

function posted() {
  const call = fetchMock.mock.calls.find(([r]) => r.method === "POST" || r.method === "PUT");
  if (!call) throw new Error("nothing was sent");
  return call[0];
}

const wrote = () => fetchMock.mock.calls.some(([r]) => r.method !== "GET");

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  setActiveOrganizationId(null);
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("business offer schema", () => {
  const valid: BusinessOfferValues = {
    ...EMPTY_BUSINESS_OFFER,
    categoryId: CATEGORY.id,
    title: "Title",
    headline: "Headline",
    benefit: { ...EMPTY_BENEFIT_VALUE, percent: "30" },
    description: "Description",
    validFrom: "2026-10-01T09:00",
    promoCode: "not checked while off",
  };
  const paths = (values: BusinessOfferValues) =>
    businessOfferSchema.safeParse(values).error?.issues.map((issue) => issue.path.join(".")) ??
    [];

  it("is open-ended and ignores employee terms while the switch is off", () => {
    expect(paths(valid)).toEqual([]);
    const body = businessOfferBody(valid);
    expect(body.valid_until).toBeNull();
    expect(body.show_to_employees).toBe(false);
    expect(body.employee_terms).toBeNull();
  });

  it("needs an end date and valid employee terms once shown to employees", () => {
    const shown = { ...valid, showToEmployees: true };
    expect(paths(shown)).toEqual(["validUntil", "promoCode"]);
    const fixed = { ...shown, validUntil: "2027-03-31T23:59", promoCode: "FIT-30" };
    expect(paths(fixed)).toEqual([]);
    expect(businessOfferBody(fixed).employee_terms).toMatchObject({
      presentation_method: "promo_code",
      promo_code: "FIT-30",
      approval_ttl_hours: null,
    });
  });

  it("needs organizations for a selected audience and sends only then", () => {
    const selected = { ...valid, audienceType: "selected_organizations" as const };
    expect(paths(selected)).toEqual(["audienceOrganizations"]);
    const chosen = { ...selected, audienceOrganizations: [{ id: BUYER, name: "Everest" }] };
    expect(businessOfferBody(chosen).audience_organization_ids).toEqual([BUYER]);
    expect(businessOfferBody({ ...chosen, audienceType: "all_businesses" }).audience_organization_ids).toEqual([]);
  });

  it("places nested employee term errors on their fields", () => {
    const setError = vi.fn();
    const error = new ApiError({
      status: 422,
      code: "VALIDATION_ERROR",
      title: "Invalid",
      fieldErrors: { "employee_terms.promo_code": "Taken", employee_terms: "Give terms" },
    });
    expect(applyApiFieldErrors(error, { setError } as never, BUSINESS_OFFER_FIELDS)).toBe(true);
    expect(setError).toHaveBeenCalledWith("promoCode", { message: "Taken" });
    expect(setError).toHaveBeenCalledWith("showToEmployees", { message: "Give terms" });
  });
});

describe("Business portal offer", () => {
  it("reads through /business with the organization and submits at the loaded version", async () => {
    serve(offer("draft"));
    setActiveOrganizationId(SELLER);
    const user = userEvent.setup();
    renderAs(
      actor(
        [BusinessOfferPermission.OFFER_VIEW, BusinessOfferPermission.OFFER_SUBMIT],
        SELLER,
        { employer: false, partner: true },
      ),
      <OwnBusinessOffer offerId={OFFER_ID} />,
    );
    await user.click(await screen.findByRole("button", { name: "Submit for review" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(wrote()).toBe(true));
    const request = posted();
    expect(new URL(request.url).pathname).toBe(`/api/v1/business/own-offers/${OFFER_ID}/submit`);
    expect(request.headers.get("X-Organization-ID")).toBe(SELLER);
    expect(await request.json()).toEqual({ expected_version: 3, reason: "" });
    expect(screen.getByText("Tell us your headcount.")).toBeVisible();
  });

  it("keeps the employee switch off for an offer posted as an employer", async () => {
    serve(offer("draft", { asPartner: false }));
    setActiveOrganizationId(SELLER);
    const user = userEvent.setup();
    renderAs(
      actor(
        [BusinessOfferPermission.OFFER_VIEW, BusinessOfferPermission.OFFER_UPDATE],
        SELLER,
        { employer: true, partner: false },
      ),
      <OwnBusinessOffer offerId={OFFER_ID} />,
    );
    await user.click(await screen.findByRole("button", { name: "Edit" }));
    const toggle = await screen.findByRole("switch", { name: "Show to employees" });
    expect(toggle).toBeDisabled();
    expect(screen.getByText(/Only an offer posted as a verified partner/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(wrote()).toBe(true));
    const body = await posted().json();
    expect(body).toMatchObject({
      intent: "save",
      expected_version: 3,
      show_to_employees: false,
      employee_terms: null,
      valid_until: null,
    });
  });

  it("sends employee terms when a partner offer is shown to employees", async () => {
    serve(offer("draft", { showToEmployees: true }));
    setActiveOrganizationId(SELLER);
    const user = userEvent.setup();
    renderAs(
      actor(
        [BusinessOfferPermission.OFFER_VIEW, BusinessOfferPermission.OFFER_UPDATE],
        SELLER,
        { employer: false, partner: true },
      ),
      <OwnBusinessOffer offerId={OFFER_ID} />,
    );
    await user.click(await screen.findByRole("button", { name: "Edit" }));
    expect(await screen.findByRole("switch", { name: "Show to employees" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(wrote()).toBe(true));
    const body = await posted().json();
    expect(body.show_to_employees).toBe(true);
    expect(body.employee_terms).toMatchObject({
      presentation_method: "in_store",
      redemption_instructions: "Show the voucher at the desk.",
      acceptance_mode: "auto_accept",
    });
  });
});

describe("Business catalogue", () => {
  it("enquires about the version it showed", async () => {
    serve(card);
    setActiveOrganizationId(BUYER);
    const user = userEvent.setup();
    renderAs(
      actor(
        [BusinessOfferPermission.CATALOGUE_VIEW, BusinessOfferPermission.SENT_ENQUIRY_CREATE],
        BUYER,
        { employer: true, partner: false },
      ),
      <BusinessCatalogueOffer offerId={OFFER_ID} />,
    );
    await user.click(await screen.findByRole("button", { name: "Enquire" }));
    await user.type(screen.getByLabelText("Message"), "120 memberships, please.");
    await user.type(screen.getByLabelText("Contact name"), "Sita Sharma");
    await user.type(screen.getByLabelText("Contact email"), "hr@everestbank.example");
    await user.click(screen.getByRole("button", { name: "Send enquiry" }));

    await waitFor(() => expect(wrote()).toBe(true));
    const request = posted();
    expect(new URL(request.url).pathname).toBe(`/api/v1/business/offers/${OFFER_ID}/enquire`);
    expect(request.headers.get("X-Organization-ID")).toBe(BUYER);
    expect(await request.json()).toEqual({
      message: "120 memberships, please.",
      contact_name: "Sita Sharma",
      contact_email: "hr@everestbank.example",
      contact_phone: "",
      version_id: VERSION_ID,
    });
  });

  it("links to the open enquiry instead of offering another", async () => {
    serve({ ...card, my_open_enquiry_id: ENQUIRY_ID });
    setActiveOrganizationId(BUYER);
    renderAs(
      actor(
        [
          BusinessOfferPermission.CATALOGUE_VIEW,
          BusinessOfferPermission.SENT_ENQUIRY_CREATE,
          BusinessOfferPermission.SENT_ENQUIRY_VIEW,
        ],
        BUYER,
        { employer: true, partner: false },
      ),
      <BusinessCatalogueOffer offerId={OFFER_ID} />,
    );
    expect(await screen.findByRole("link", { name: "View your open enquiry" })).toHaveAttribute(
      "href",
      `/business/enquiries/${ENQUIRY_ID}`,
    );
    expect(screen.queryByRole("button", { name: "Enquire" })).not.toBeInTheDocument();
  });
});

describe("Leads", () => {
  it("closes an open lead with a note for the enquirer, only with the manage code", async () => {
    serve(enquiry);
    setActiveOrganizationId(SELLER);
    const user = userEvent.setup();
    const { unmount } = renderAs(
      actor([BusinessOfferPermission.RECEIVED_ENQUIRY_VIEW], SELLER, {
        employer: false,
        partner: true,
      }),
      <Lead enquiryId={ENQUIRY_ID} />,
    );
    expect(await screen.findByText("hr@everestbank.example")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Close enquiry" })).not.toBeInTheDocument();
    unmount();

    renderAs(
      actor(
        [
          BusinessOfferPermission.RECEIVED_ENQUIRY_VIEW,
          BusinessOfferPermission.RECEIVED_ENQUIRY_MANAGE,
        ],
        SELLER,
        { employer: false, partner: true },
      ),
      <Lead enquiryId={ENQUIRY_ID} />,
    );
    await user.click(await screen.findByRole("button", { name: "Close enquiry" }));
    await user.type(screen.getByLabelText(/Note to Everest Bank/), "Quote sent.");
    await user.click(screen.getAllByRole("button", { name: "Close enquiry" }).at(-1)!);

    await waitFor(() => expect(wrote()).toBe(true));
    const request = posted();
    expect(new URL(request.url).pathname).toBe(
      `/api/v1/business/received-enquiries/${ENQUIRY_ID}/close`,
    );
    expect(await request.json()).toEqual({ closing_note: "Quote sent." });
  });
});

describe("<AdminBusinessOffer>", () => {
  it("approves the working version it showed through the business endpoint", async () => {
    serve(offer("in_review"));
    const user = userEvent.setup();
    renderAs(
      actor([OfferAdminPermission.OFFER_VIEW, OfferAdminPermission.OFFER_APPROVE], null),
      <AdminBusinessOffer offerId={OFFER_ID} />,
    );
    expect(await screen.findByText("Awaiting your review")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Approve" }));
    await user.click(screen.getByRole("button", { name: "Approve version" }));

    await waitFor(() => expect(wrote()).toBe(true));
    const request = posted();
    expect(new URL(request.url).pathname).toBe(
      `/api/v1/admin/business-offers/${OFFER_ID}/approve`,
    );
    expect(request.headers.get("X-Organization-ID")).toBeNull();
    expect(await request.json()).toEqual({
      reason: "",
      expected_version: 3,
      version_id: VERSION_ID,
    });
  });
});
