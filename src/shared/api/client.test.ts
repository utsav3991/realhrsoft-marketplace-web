import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setAccessToken } from "@/shared/auth/token-store";

import { apiFetch, setAccessTokenRenewer } from "./client";
import { setActiveOrganizationId } from "./organization-context";

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();

function sent(call: number): Request {
  const request = fetchMock.mock.calls[call]?.[0];
  if (!request) throw new Error(`fetch call ${call} did not happen`);
  return request;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  setAccessToken(null);
  setActiveOrganizationId(null);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  setAccessTokenRenewer(async () => false);
});

describe("apiFetch", () => {
  it("attaches the bearer token, organization scope and a request id", async () => {
    setAccessToken("token-1");
    setActiveOrganizationId("org-1");
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await apiFetch(new Request("http://localhost:3000/api/v1/auth/me"));

    expect(sent(0).headers.get("Authorization")).toBe("Bearer token-1");
    expect(sent(0).headers.get("X-Organization-ID")).toBe("org-1");
    expect(sent(0).headers.get("X-Request-ID")).toBeTruthy();
  });

  it.each([
    ["/auth/me", true],
    ["/employer/benefits", true],
    ["/partner/offers/1", true],
    ["/partner/profile", true],
    ["/partner/applications/mine", false],
    ["/admin/users", false],
    ["/admin/organizations", false],
  ])("sends X-Organization-ID to %s only when organization-scoped (%s)", async (path, scoped) => {
    setAccessToken("token-1");
    setActiveOrganizationId("org-1");
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await apiFetch(new Request(`http://localhost:3000/api/v1${path}`));

    expect(sent(0).headers.get("X-Organization-ID")).toBe(scoped ? "org-1" : null);
  });

  it("renews once on 401 and replays with the new token", async () => {
    setAccessToken("expired");
    setAccessTokenRenewer(async () => {
      setAccessToken("fresh");
      return true;
    });
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const response = await apiFetch(
      new Request("http://localhost:3000/api/v1/admin/roles", { method: "POST", body: "{}" }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sent(1).headers.get("Authorization")).toBe("Bearer fresh");
    expect(await sent(1).text()).toBe("{}");
  });

  it("returns the 401 when renewal fails", async () => {
    setAccessTokenRenewer(async () => false);
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    const response = await apiFetch(new Request("http://localhost:3000/api/v1/auth/me"));

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never refresh-and-retries the session endpoints themselves", async () => {
    const renew = vi.fn(async () => true);
    setAccessTokenRenewer(renew);
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await apiFetch(new Request("http://localhost:3000/api/v1/auth/refresh", { method: "POST" }));

    expect(renew).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
