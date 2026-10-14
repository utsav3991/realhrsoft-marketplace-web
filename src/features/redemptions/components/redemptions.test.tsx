import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeQueryClient, setActiveOrganizationId, type Schemas } from "@/shared/api";
import { SessionContext, type CurrentActor, type SessionValue } from "@/shared/auth";
import {
  PartnerRedemptionPermission,
  RedemptionAdminPermission,
  type PermissionCode,
} from "@/shared/authorization";

import { AdminVoucherRecord } from "./admin-vouchers";
import { RedeemCounter } from "./redeem-counter";
import { RedemptionControl } from "./redemption-blocks";
import { VoucherQr } from "./voucher-qr";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const ORG = "4a293c96-2952-43ac-bf39-bdfda7531c48";
const OFFER_ID = "6a1c9d2e-4b7f-4e3a-8c5d-1f2e3a4b5c6d";
const VOUCHER_ID = "8c1e3a5b-7d9f-4b1a-8c3e-5a7b9c1d3e5f";
const RECEIPT_ID = "c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f";
const KEY = /^[0-9a-f-]{36}$/;
const QR = "realhrsoft:v1:3q2-7wEXAMPLEtokenNOTreal0123456789abcdefg";
const SCAN_REFERENCE = "Qm9vZ2llLXNjYW4tcmVmZXJlbmNlLWV4YW1wbGUtMDAx";

const presentation: Schemas["Presentation"] = {
  method: "promo_code",
  promo_code: "JAVA20",
  redemption_url: "",
  redemption_instructions: "",
  custom_method_name: "",
};
const benefit = { schema_version: 1, type: "percentage", description: "", percent: "20" };

const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

const scan: Schemas["Scan"] = {
  scan_reference: SCAN_REFERENCE,
  expires_at: inMinutes(10),
  voucher: {
    id: VOUCHER_ID,
    status: "available",
    title: "20% off at Himalayan Java",
    headline: "20% off all drinks",
    benefit,
    presentation,
    valid_until: "2026-12-31T00:00:00Z",
  },
};

const receipt: Schemas["PartnerRedemption"] = {
  id: RECEIPT_ID,
  voucher_id: VOUCHER_ID,
  offer_id: OFFER_ID,
  title: scan.voucher.title,
  partner: "Himalayan Java",
  source: "partner_scan",
  confirmed_at: "2026-10-02T12:03:41Z",
  sale_reference: "BILL-20451",
  reversed_at: null,
  reversal_reason: null,
};

const ownVoucher: Schemas["OwnVoucher"] = {
  id: VOUCHER_ID,
  status: "available",
  reference: "K7M2Q9XH4T",
  valid_from: "2026-09-01T00:00:00Z",
  valid_until: "2026-12-31T00:00:00Z",
  presentation,
  used_at: null,
  redemption: null,
  claim_id: "0e2f9a51-7c3d-4b8e-9f10-2a3b4c5d6e7f",
  offer_id: OFFER_ID,
  partner: "Himalayan Java",
  title: scan.voucher.title,
  headline: scan.voucher.headline,
  benefit,
  revoked_at: null,
};

const adminVoucher: Schemas["Voucher"] = {
  ...ownVoucher,
  revocation_reason: null,
  beneficiary_id: "9d31c4aa-1f99-4c90-b748-e00893786136",
  beneficiary_email: "asha@employer.test",
};

const page = <T,>(results: T[]) => ({ count: results.length, next: null, previous: null, results });

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" },
  });
}

function problem(status: number, code: string) {
  return json({ type: "about:blank", title: code, status, code, detail: code }, status);
}

function actor(overrides: Partial<CurrentActor> = {}): CurrentActor {
  return {
    id: "actor-1",
    actorType: "employee",
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

function cashier(permissions: PermissionCode[]): CurrentActor {
  return actor({
    actorType: "marketplace_staff",
    organization: { id: ORG, permissions: new Set(permissions) },
    memberships: [{ organizationId: ORG, name: "Himalayan Java", employer: false, partner: true }],
  });
}

const admin = (permissions: PermissionCode[]) =>
  actor({ actorType: "marketplace_staff", globalPermissions: new Set(permissions) });

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

const path = (request: Request) => new URL(request.url).pathname;
const posts = () => fetchMock.mock.calls.filter(([r]) => r.method === "POST").map(([r]) => r);

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  setActiveOrganizationId(null);
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("Voucher QR", () => {
  it("shows a fresh QR on request and hides it once the partner confirms the use", async () => {
    let used = false;
    fetchMock.mockImplementation(async (request) => {
      if (request.method === "POST") {
        return json({ voucher_id: VOUCHER_ID, qr_payload: QR, expires_at: inMinutes(5) });
      }
      return json({ ...ownVoucher, status: used ? "used" : "available" });
    });
    const user = userEvent.setup();
    renderAs(actor(), <VoucherQr voucherId={VOUCHER_ID} reference={ownVoucher.reference} />);

    // Nothing is issued until the owner asks: issuing is throttled and replaces the last QR.
    expect(posts()).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Show QR code" }));
    expect(
      await screen.findByRole("img", { name: "Voucher QR code for the partner to scan" }),
    ).toBeVisible();
    expect(path(posts()[0]!)).toBe(`/api/v1/marketplace/vouchers/${VOUCHER_ID}/credential`);
    expect(screen.getByText(/Expires in 4:5\d|Expires in 5:00/)).toBeVisible();

    used = true;
    await waitFor(
      () => expect(screen.queryByRole("img", { name: /Voucher QR code/ })).not.toBeInTheDocument(),
      { timeout: 6000 },
    );
  }, 10_000);

  it("names an emergency block instead of showing a QR", async () => {
    fetchMock.mockResolvedValue(problem(409, "REDEMPTION_BLOCKED"));
    const user = userEvent.setup();
    renderAs(actor(), <VoucherQr voucherId={VOUCHER_ID} reference={ownVoucher.reference} />);
    await user.click(screen.getByRole("button", { name: "Show QR code" }));
    expect(await screen.findByText("Temporarily blocked by Aayulogic")).toBeVisible();
    expect(screen.queryByRole("img", { name: /Voucher QR code/ })).not.toBeInTheDocument();
  });
});

describe("Partner counter", () => {
  const everything = [
    PartnerRedemptionPermission.VOUCHER_VALIDATE,
    PartnerRedemptionPermission.VOUCHER_CONFIRM,
  ];

  it("validates a scan, then confirms with the scan reference and an Idempotency-Key", async () => {
    fetchMock.mockImplementation(async (request) =>
      path(request).endsWith("/voucher-scans") ? json(scan, 201) : json(receipt, 201),
    );
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(cashier(everything), <RedeemCounter />);

    await user.type(screen.getByLabelText("QR code"), `${QR}{Enter}`);
    expect(await screen.findByText("20% off")).toBeVisible();
    expect(screen.getByText("JAVA20")).toBeVisible();
    const validate = posts()[0]!;
    expect(validate.headers.get("X-Organization-ID")).toBe(ORG);
    expect(await validate.json()).toEqual({ token: QR });
    // The customer's QR does not linger in the field.
    expect(screen.queryByDisplayValue(QR)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Bill reference/), "BILL-20451");
    await user.click(screen.getByRole("button", { name: "Confirm use" }));
    expect(await screen.findByText("Use confirmed: apply the benefit now")).toBeVisible();

    const confirm = posts()[1]!;
    expect(path(confirm)).toBe("/api/v1/partner/redemptions");
    expect(confirm.headers.get("X-Organization-ID")).toBe(ORG);
    expect(confirm.headers.get("Idempotency-Key")).toMatch(KEY);
    expect(await confirm.json()).toEqual({
      scan_reference: SCAN_REFERENCE,
      sale_reference: "BILL-20451",
    });
    expect(screen.getByRole("link", { name: "Open receipt" })).toHaveAttribute(
      "href",
      `/partner/redemptions/${RECEIPT_ID}`,
    );
  });

  it("tells the cashier not to apply the benefit of a used voucher", async () => {
    fetchMock.mockResolvedValue(problem(409, "VOUCHER_ALREADY_USED"));
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(cashier(everything), <RedeemCounter />);
    await user.type(screen.getByLabelText("QR code"), `${QR}{Enter}`);
    expect(await screen.findByText("Already used: do not apply the benefit")).toBeVisible();
  });

  it("confirms a typed reference, normalized, without a scan", async () => {
    fetchMock.mockResolvedValue(json({ ...receipt, source: "partner_manual" }, 201));
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(cashier(everything), <RedeemCounter />);
    await user.click(screen.getByRole("tab", { name: "Type code" }));
    await user.type(screen.getByLabelText("Voucher code"), "k7m2 q9xh-4t");
    await user.click(screen.getByRole("button", { name: "Confirm use" }));

    expect(await screen.findByText("Use confirmed: apply the benefit now")).toBeVisible();
    expect(await posts()[0]!.json()).toEqual({
      voucher_reference: "K7M2Q9XH4T",
      sale_reference: "",
    });
  });

  it("recovers a lost confirmation response by its Idempotency-Key", async () => {
    let confirmations = 0;
    fetchMock.mockImplementation(async (request) => {
      if (path(request).endsWith("/voucher-scans")) return json(scan, 201);
      if (request.method === "POST") {
        confirmations += 1;
        throw new TypeError("Failed to fetch");
      }
      return json(receipt);
    });
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(cashier(everything), <RedeemCounter />);
    await user.type(screen.getByLabelText("QR code"), `${QR}{Enter}`);
    await user.click(await screen.findByRole("button", { name: "Confirm use" }));

    expect(await screen.findByText("We could not tell whether the use was recorded")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Check the result" }));
    expect(await screen.findByText("Use confirmed: apply the benefit now")).toBeVisible();

    const key = posts()[1]!.headers.get("Idempotency-Key");
    const lookup = fetchMock.mock.calls.map(([r]) => r).find((r) => r.method === "GET")!;
    expect(path(lookup)).toBe(`/api/v1/partner/redemptions/operations/${key}`);
    expect(confirmations).toBe(1);
  });

  it("checks vouchers without offering to confirm them for a member who may only validate", async () => {
    fetchMock.mockResolvedValue(json(scan, 201));
    setActiveOrganizationId(ORG);
    const user = userEvent.setup();
    renderAs(cashier([PartnerRedemptionPermission.VOUCHER_VALIDATE]), <RedeemCounter />);
    expect(screen.getByRole("tab", { name: "Type code" })).toBeDisabled();
    await user.type(screen.getByLabelText("QR code"), `${QR}{Enter}`);
    expect(
      await screen.findByText("You can check vouchers but not confirm their use"),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Confirm use" })).not.toBeInTheDocument();
  });
});

describe("Voucher administration", () => {
  it("revokes an unused voucher with a reason and an Idempotency-Key", async () => {
    fetchMock.mockImplementation(async (request) =>
      request.method === "POST"
        ? json({ ...adminVoucher, status: "revoked", revoked_at: "2026-10-01T00:00:00Z" })
        : json(adminVoucher),
    );
    const user = userEvent.setup();
    renderAs(
      admin([RedemptionAdminPermission.VOUCHER_VIEW, RedemptionAdminPermission.VOUCHER_REVOKE]),
      <AdminVoucherRecord voucherId={VOUCHER_ID} />,
    );
    expect(await screen.findByText("asha@employer.test")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Confirm use/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Revoke" }));
    await user.type(screen.getByLabelText("Reason"), "Issued to the wrong employee.");
    await user.click(screen.getByRole("button", { name: "Revoke voucher" }));

    await waitFor(() => expect(posts()).toHaveLength(1));
    const request = posts()[0]!;
    expect(path(request)).toBe(`/api/v1/admin/vouchers/${VOUCHER_ID}/revoke`);
    expect(request.headers.get("Idempotency-Key")).toMatch(KEY);
    expect(await request.json()).toEqual({ reason: "Issued to the wrong employee." });
  });

  it("shows an active block on the offer's page instead of offering another", async () => {
    const block: Schemas["Block"] = {
      id: "d4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f7a",
      scope: "offer",
      offer_id: OFFER_ID,
      partner_id: null,
      active: true,
      reason: "Reports of QR screenshots being resold.",
      activated_at: "2026-10-01T09:00:00Z",
      activated_by: "9d31c4aa-1f99-4c90-b748-e00893786136",
      cleared_at: null,
      cleared_by: null,
      clear_reason: "",
    };
    fetchMock.mockResolvedValue(json(page([block])));
    renderAs(
      admin([RedemptionAdminPermission.BLOCK_VIEW, RedemptionAdminPermission.BLOCK_ACTIVATE]),
      <RedemptionControl scope="offer" targetId={OFFER_ID} />,
    );
    expect(await screen.findByText(block.reason)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Block redemptions" })).not.toBeInTheDocument();
    const list = new URL(fetchMock.mock.calls[0]![0].url);
    expect(list.searchParams.get("active")).toBe("true");
    expect(list.searchParams.get("scope")).toBe("offer");
  });
});
