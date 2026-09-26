import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePageParam } from "./use-page-param";
import { useSortParam } from "./use-sort-param";
import { useUrlParams } from "./use-url-params";

const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/admin/claims",
  useSearchParams: () => new URLSearchParams(search),
}));

beforeEach(() => {
  replace.mockReset();
  search = "";
});

describe("useUrlParams", () => {
  it("returns every table to its first page when a filter changes", () => {
    search = "status=active&page=3&employments_page=2&page_size=20";
    const { result } = renderHook(() => useUrlParams());
    result.current.set({ partner_id: "p1" });
    expect(replace).toHaveBeenCalledWith("/admin/claims?status=active&page_size=20&partner_id=p1", {
      scroll: false,
    });
  });

  it("keeps other params when only the page changes", () => {
    search = "status=active&page=3";
    const { result } = renderHook(() => usePageParam());
    expect(result.current).toMatchObject({ page: 3, pageSize: 10, offset: 20, limit: 10 });
    result.current.setPage(4);
    expect(replace).toHaveBeenCalledWith("/admin/claims?status=active&page=4", { scroll: false });
  });
});

describe("usePageParam", () => {
  it("reads out-of-range values as the defaults", () => {
    search = "page=-2&page_size=7";
    const { result } = renderHook(() => usePageParam());
    expect(result.current).toMatchObject({ page: 1, pageSize: 10, offset: 0 });
  });

  it("keeps a prefixed table apart and resets its page with a new size", () => {
    search = "page=2&employments_page=3";
    const { result } = renderHook(() => usePageParam("employments_"));
    expect(result.current.page).toBe(3);
    result.current.setPageSize(20);
    expect(replace).toHaveBeenCalledWith("/admin/claims?page=2&employments_page_size=20", {
      scroll: false,
    });
  });
});

describe("useSortParam", () => {
  it("accepts only known keys and resets the page when the order changes", () => {
    search = "ordering=-bogus&page=2";
    const { result } = renderHook(() => useSortParam(["claimed_at"] as const));
    expect(result.current.value).toBeNull();
    result.current.onChange("-claimed_at");
    expect(replace).toHaveBeenCalledWith("/admin/claims?ordering=-claimed_at", { scroll: false });
  });
});
