import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
  getActiveClientId,
  getActiveOrganizationId,
  setActiveClientId,
  setActiveOrganizationId,
  markClientDenied,
  markOrganizationDenied,
  isClientDenied,
  isOrganizationDenied,
} from "@/shared/api";
import { endImpersonation, impersonate, listenForLogoutElsewhere } from "./session";
import { getAccessToken, setAccessToken } from "./token-store";

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();
const channels: Channel[] = [];
class Channel {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  postMessage = vi.fn();
  close = vi.fn();
  constructor() {
    channels.push(this);
  }
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("BroadcastChannel", Channel);
  setAccessToken("admin-token");
  setActiveClientId("client");
  setActiveOrganizationId("org");
  markClientDenied("client");
  markOrganizationDenied("org");
});
afterEach(() => {
  fetchMock.mockReset();
  channels.length = 0;
  vi.unstubAllGlobals();
  setAccessToken(null);
  setActiveClientId(null);
  setActiveOrganizationId(null);
});

it("switches credentials and clears both scopes and denied scopes", async () => {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ access_token: "partner-token" }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  await impersonate({ user_id: "user", reason: "Support request" });
  expect(getAccessToken()).toBe("partner-token");
  expect(getActiveOrganizationId()).toBeNull();
  expect(getActiveClientId()).toBeNull();
  expect(isOrganizationDenied("org")).toBe(false);
  expect(isClientDenied("client")).toBe(false);
  expect(channels[0]?.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({ type: "session-changed", destination: "/partner" }),
  );
  expect(channels[0]?.close).toHaveBeenCalled();
});

it("keeps the original session on a denied start", async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
  await expect(impersonate({ user_id: "user", reason: "Support" })).rejects.toThrow();
  expect(getAccessToken()).toBe("admin-token");
  expect(getActiveOrganizationId()).toBe("org");
  expect(channels).toHaveLength(0);
});

it.each([200, 204])("handles ending with status %s", async (status) => {
  fetchMock.mockResolvedValue(
    status === 204
      ? new Response(null, { status })
      : new Response(JSON.stringify({ access_token: "restored" }), {
          headers: { "Content-Type": "application/json" },
        }),
  );
  expect(await endImpersonation()).toBe(status === 200);
  expect(getAccessToken()).toBe(status === 200 ? "restored" : null);
  expect(getActiveClientId()).toBeNull();
});

it("invalidates the old token and scope when another tab switches", () => {
  const changed = vi.fn();
  const unsubscribe = listenForLogoutElsewhere(changed);
  channels[0]?.onmessage?.({ data: "session-changed" });
  expect(changed).toHaveBeenCalledOnce();
  expect(getAccessToken()).toBeNull();
  expect(getActiveOrganizationId()).toBeNull();
  expect(getActiveClientId()).toBeNull();
  unsubscribe();
  expect(channels[0]?.close).toHaveBeenCalled();
});

it("ignores its own broadcast instead of reloading the administrator URL", async () => {
  const changed = vi.fn();
  const unsubscribe = listenForLogoutElsewhere(changed);
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ access_token: "partner-token" }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  await impersonate({ user_id: "user", reason: "Support" });
  const message = channels[1]?.postMessage.mock.calls[0]?.[0];
  expect(message).toBeDefined();
  channels[0]?.onmessage?.({ data: message });
  expect(changed).not.toHaveBeenCalled();
  expect(getAccessToken()).toBe("partner-token");
  unsubscribe();
});

it.each(["/partner", "/admin/users", "/login"])("sends other tabs to %s", (destination) => {
  const changed = vi.fn();
  const unsubscribe = listenForLogoutElsewhere(changed);
  channels[0]?.onmessage?.({ data: { type: "session-changed", sender: "other-tab", destination } });
  expect(changed).toHaveBeenCalledWith(destination);
  expect(getAccessToken()).toBeNull();
  unsubscribe();
});

it("never navigates to an arbitrary broadcast destination", () => {
  const changed = vi.fn();
  const unsubscribe = listenForLogoutElsewhere(changed);
  channels[0]?.onmessage?.({
    data: {
      type: "session-changed",
      sender: "other-tab",
      destination: "https://example.com",
    },
  });
  expect(changed).toHaveBeenCalledWith(undefined);
  unsubscribe();
});
