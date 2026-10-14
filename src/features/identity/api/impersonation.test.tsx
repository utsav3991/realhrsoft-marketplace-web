import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { makeQueryClient } from "@/shared/api";
import { useEndImpersonation, useImpersonate } from "./impersonation";

const session = vi.hoisted(() => ({ start: vi.fn(), end: vi.fn() }));
vi.mock("@/shared/auth/session", () => ({
  impersonate: session.start,
  endImpersonation: session.end,
}));
const assign = vi.fn();
beforeEach(() => {
  session.start.mockReset();
  session.end.mockReset();
  assign.mockReset();
  vi.stubGlobal("window", { location: { assign } });
});
afterEach(() => vi.unstubAllGlobals());

function setup() {
  const cache = makeQueryClient();
  cache.setQueryData(["sensitive-admin-data"], { secret: "old account" });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cache}>{children}</QueryClientProvider>
  );
  return { cache, wrapper };
}

it("drops cached account data and navigates to the partner after starting", async () => {
  const { cache, wrapper } = setup();
  const hook = renderHook(useImpersonate, { wrapper });
  await act(async () => hook.result.current.mutateAsync({ user_id: "partner", reason: "Support" }));
  expect(cache.getQueryData(["sensitive-admin-data"])).toBeUndefined();
  expect(assign).toHaveBeenCalledWith("/partner");
});

it.each([true, false])("ends and navigates safely when restoration is %s", async (restored) => {
  session.end.mockResolvedValue(restored);
  const { cache, wrapper } = setup();
  const hook = renderHook(useEndImpersonation, { wrapper });
  await act(async () => hook.result.current.mutateAsync());
  expect(cache.getQueryData(["sensitive-admin-data"])).toBeUndefined();
  expect(assign).toHaveBeenCalledWith(restored ? "/admin/users" : "/login");
});

it("preserves the current account and page when starting fails", async () => {
  session.start.mockRejectedValue(new Error("Denied"));
  const { cache, wrapper } = setup();
  const hook = renderHook(useImpersonate, { wrapper });
  await act(async () => {
    await expect(
      hook.result.current.mutateAsync({ user_id: "partner", reason: "Support" }),
    ).rejects.toThrow("Denied");
  });
  expect(cache.getQueryData(["sensitive-admin-data"])).toBeDefined();
  expect(assign).not.toHaveBeenCalled();
});
