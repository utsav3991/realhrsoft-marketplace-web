import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "sonner";

import { makeQueryClient, type Schemas } from "@/shared/api";

import { notificationHref } from "../targets";

import { NotificationBell } from "./notification-bell";
import { NotificationInbox } from "./notification-inbox";

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn() }) }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/marketplace/notifications",
  useSearchParams: () => new URLSearchParams(),
}));

const VOUCHER_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const NEWEST_ID = "5f0c2b7e-9a41-4d8e-b3c6-2e7f1a9d4c80";
const OLDER_ID = "6e1d3c8f-0b52-4e9f-a4d7-3f8a2b0e5d91";

const issued: Schemas["Notification"] = {
  id: NEWEST_ID,
  category: "voucher",
  title: "Voucher issued: 20% off at Himalayan Java",
  body: "Your claim was accepted and a voucher was issued.",
  target_type: "voucher",
  target_id: VOUCHER_ID,
  occurred_at: "2026-10-02T12:00:00Z",
  created_at: "2026-10-02T12:00:04Z",
  read_at: null,
};

const older: Schemas["Notification"] = {
  ...issued,
  id: OLDER_ID,
  title: "Voucher revoked: <img src=x onerror=alert(1)>",
  body: "<script>alert(1)</script>",
  target_type: "unknown_kind",
  read_at: "2026-10-01T09:00:00Z",
};

const page = <T,>(results: T[]) => ({ count: results.length, next: null, previous: null, results });

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function serve({ unread = 1 } = {}) {
  fetchMock.mockImplementation(async (request) => {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/unread-count")) return json({ unread });
    if (url.pathname.endsWith("/notification-preferences")) {
      return json({ email_enabled: true, email: "ram@acme.example", in_app_enabled: true });
    }
    if (url.pathname.endsWith("/read-all")) return json({ marked: 1 });
    if (url.pathname.endsWith("/read")) return json({ ...issued, read_at: "2026-10-02T12:05:00Z" });
    return json(page([issued, older]));
  });
}

function renderWithClient(ui: React.ReactNode) {
  return render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>);
}

const posts = () => fetchMock.mock.calls.map(([r]) => r).filter((r) => r.method === "POST");

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  fetchMock.mockReset();
  vi.mocked(toast).mockClear();
  vi.unstubAllGlobals();
});

describe("notification targets", () => {
  it("links only allowlisted types with a valid UUID to an internal route", () => {
    expect(notificationHref(issued)).toBe(`/marketplace/vouchers/${VOUCHER_ID}`);
    expect(notificationHref({ target_type: "partner_claim", target_id: VOUCHER_ID })).toBe(
      `/partner/claims/${VOUCHER_ID}`,
    );
    expect(notificationHref({ target_type: "admin_redemption", target_id: VOUCHER_ID })).toBe(
      `/admin/redemptions/${VOUCHER_ID}`,
    );
    expect(notificationHref({ target_type: "unknown_kind", target_id: VOUCHER_ID })).toBeNull();
    expect(notificationHref({ target_type: "constructor", target_id: VOUCHER_ID })).toBeNull();
    expect(notificationHref({ target_type: "voucher", target_id: null })).toBeNull();
    expect(notificationHref({ target_type: "voucher", target_id: "../../admin/users" })).toBeNull();
    expect(notificationHref({ target_type: "voucher", target_id: "//evil.example/x" })).toBeNull();
  });
});

describe("Notification bell", () => {
  it("shows the unread count and loads items only when opened", async () => {
    serve({ unread: 3 });
    const user = userEvent.setup();
    renderWithClient(<NotificationBell inboxHref="/marketplace/notifications" />);

    const bell = await screen.findByRole("button", { name: "Notifications, 3 unread" });
    const lists = () =>
      fetchMock.mock.calls.filter(([r]) => new URL(r.url).pathname === "/api/v1/me/notifications");
    expect(lists()).toHaveLength(0);

    await user.click(bell);
    const list = await screen.findByRole("list", { name: "Latest notifications" });
    expect(within(list).getByText(issued.title)).toBeVisible();
    expect(lists()).toHaveLength(1);
    // Account-wide: never sent with an organization header.
    expect(lists()[0]![0].headers.get("X-Organization-ID")).toBeNull();
  });

  it("marks everything up to the newest item shown read", async () => {
    serve();
    const user = userEvent.setup();
    renderWithClient(<NotificationBell inboxHref="/marketplace/notifications" />);
    await user.click(await screen.findByRole("button", { name: "Notifications, 1 unread" }));
    await screen.findByRole("list", { name: "Latest notifications" });

    await user.click(screen.getByRole("button", { name: "Mark all read" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    const request = posts()[0]!;
    expect(new URL(request.url).pathname).toBe("/api/v1/me/notifications/read-all");
    expect(await request.json()).toEqual({ up_to_id: NEWEST_ID });
  });

  it("pops up items that arrive while the app is open, not ones already unread", async () => {
    serve({ unread: 1 });
    const client = makeQueryClient();
    render(
      <QueryClientProvider client={client}>
        <NotificationBell inboxHref="/marketplace/notifications" />
      </QueryClientProvider>,
    );
    await screen.findByRole("button", { name: "Notifications, 1 unread" });
    expect(toast).not.toHaveBeenCalled();

    serve({ unread: 2 });
    await client.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        issued.title,
        expect.objectContaining({ description: issued.body }),
      ),
    );
    // One arrived, so one pop-up, even though the latest page holds more.
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("opening a linked item marks it read", async () => {
    serve();
    const user = userEvent.setup();
    renderWithClient(<NotificationBell inboxHref="/marketplace/notifications" />);
    await user.click(await screen.findByRole("button", { name: "Notifications, 1 unread" }));
    const link = await screen.findByRole("link", { name: /Voucher issued/ });
    expect(link).toHaveAttribute("href", `/marketplace/vouchers/${VOUCHER_ID}`);

    await user.click(link);
    await waitFor(() =>
      expect(new URL(posts()[0]!.url).pathname).toBe(`/api/v1/me/notifications/${NEWEST_ID}/read`),
    );
  });
});

describe("Notification inbox", () => {
  it("renders API text as text, never markup, and links nothing for unknown targets", async () => {
    serve();
    const { container } = renderWithClient(<NotificationInbox />);

    expect(await screen.findByText(older.title)).toBeVisible();
    expect(screen.getByText(older.body)).toBeVisible();
    expect(container.querySelector("img, script")).toBeNull();
    // Only the voucher item gets an Open link; the unknown type does not.
    expect(screen.getAllByRole("link", { name: "Open" })).toHaveLength(1);
    // Unread state is announced, not only colored.
    expect(screen.getByText("Unread:")).toBeInTheDocument();
  });

  it("marks one item read", async () => {
    serve();
    const user = userEvent.setup();
    renderWithClient(<NotificationInbox />);
    await user.click(await screen.findByRole("button", { name: "Mark read" }));
    await waitFor(() =>
      expect(new URL(posts()[0]!.url).pathname).toBe(`/api/v1/me/notifications/${NEWEST_ID}/read`),
    );
  });
});
