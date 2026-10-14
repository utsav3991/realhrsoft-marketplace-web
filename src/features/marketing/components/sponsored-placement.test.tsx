import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeQueryClient, type Schemas } from "@/shared/api";

import { aspectClass, SLOTS, SponsoredBanner } from "./sponsored-placement";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/marketplace",
  useSearchParams: () => new URLSearchParams(),
}));

const AD_ID = "6a1c9d2e-4b7f-4e3a-8c5d-1f2e3a4b5c6d";
const OFFER_ID = "2e3d4c5b-6f7a-4b8c-9d0e-1f2a3b4c5d6e";

const ad: Schemas["ServedAd"] = {
  id: AD_ID,
  revision_id: "5e7c9a1b-3d5f-4b7a-8c9e-1a3c5e7a9b2d",
  creative_type: "image_banner",
  headline: "Dashain coffee week",
  body: "",
  alt_text: "Iced latte on a table",
  cta_label: "Order now",
  has_image: true,
  link_target: "internal",
  destination_type: "offer",
  sponsor: "Himalayan Java",
};

const REPLACEMENT = "7b9d1f3a-5c7e-4a9b-8d1f-3a5c7e9b1d2f";

const slot: Schemas["Placement"]["slot"] = {
  key: SLOTS.homeTop,
  surface: "marketplace_home",
  width: 1200,
  height: 300,
  max_ads: 1,
};
let placement: Schemas["Placement"] = { slot, ads: [ad] };

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();
let observed: ((ratio: number) => void) | null = null;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" },
  });
}

function serve({
  clickStatus = 200,
  clickCode = "NOT_FOUND",
  image = "ok",
}: { clickStatus?: number; clickCode?: string; image?: "ok" | "pending" | "fail" } = {}) {
  fetchMock.mockImplementation(async (request) => {
    const path = new URL(request.url).pathname;
    if (path.endsWith(`/placements/${SLOTS.homeTop}`)) return json(placement);
    if (path.endsWith("/image")) {
      if (image === "pending") return new Promise<Response>(() => undefined);
      if (image === "fail") return json({ status: 500, code: "INTERNAL_ERROR" }, 500);
      return new Response(new Blob(["png"], { type: "image/png" }), {
        headers: { "Content-Type": "image/png" },
      });
    }
    if (path.endsWith("/rendered")) return new Response(null, { status: 204 });
    if (path.endsWith("/click")) {
      return clickStatus === 200
        ? json({ target: "internal", url: `/marketplace/offers/${OFFER_ID}` })
        : json({ status: clickStatus, code: clickCode, title: "Refused" }, clickStatus);
    }
    return json({}, 404);
  });
}

/** Scrolls the banner to `ratio` visibility, as the browser's IntersectionObserver would. */
function scrollTo(ratio: number) {
  act(() => observed?.(ratio));
}

function renderBanner(ui: ReactNode = <SponsoredBanner slotKey={SLOTS.homeTop} />) {
  const client = makeQueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function calls(suffix: string) {
  return fetchMock.mock.calls.filter(([request]) => new URL(request.url).pathname.endsWith(suffix));
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe() {
        observed = (ratio) =>
          this.callback(
            [{ intersectionRatio: ratio } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
      }
      disconnect() {
        observed = null;
      }
    },
  );
});
afterEach(() => {
  fetchMock.mockReset();
  push.mockReset();
  observed = null;
  placement = { slot, ads: [ad] };
  vi.unstubAllGlobals();
});

describe("sponsored placements", () => {
  it("renders a labelled banner and reports it rendered once on screen", async () => {
    serve();
    renderBanner();
    expect(await screen.findByText("Sponsored")).toBeVisible();
    expect(screen.getByText("Himalayan Java")).toBeVisible();
    const image = await screen.findByAltText("Iced latte on a table");
    expect(new URL(calls("/image")[0]![0].url).searchParams.get("revision")).toBe(ad.revision_id);

    scrollTo(0.6);
    expect(calls("/rendered")).toHaveLength(0);
    fireEvent.load(image);
    scrollTo(0.2);
    expect(calls("/rendered")).toHaveLength(0);
    scrollTo(0.6);
    await waitFor(() => expect(calls("/rendered")).toHaveLength(1));
    expect(await calls("/rendered")[0]?.[0].json()).toEqual({
      slot: SLOTS.homeTop,
      revision: ad.revision_id,
    });
    scrollTo(0.9);
    expect(calls("/rendered")).toHaveLength(1);
  });

  it.each(["pending", "fail"] as const)("does not count a %s image as rendered", async (image) => {
    serve({ image });
    renderBanner();
    await screen.findByText("Sponsored");
    await waitFor(() => expect(calls("/image")).toHaveLength(1));
    scrollTo(0.6);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByAltText("Iced latte on a table")).toBeNull();
    expect(calls("/rendered")).toHaveLength(0);
  });

  it("follows only the link the API returns", async () => {
    serve();
    renderBanner();
    await userEvent.click(await screen.findByRole("button", { name: /Sponsored: Dashain/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/marketplace/offers/${OFFER_ID}`));
    expect(calls("/click")).toHaveLength(1);
  });

  it("sends the revision shown with the click", async () => {
    serve();
    renderBanner();
    await userEvent.click(await screen.findByRole("button", { name: /Sponsored: Dashain/ }));
    await waitFor(() => expect(calls("/click")).toHaveLength(1));
    expect(await calls("/click")[0]?.[0].json()).toEqual({
      slot: SLOTS.homeTop,
      revision: ad.revision_id,
    });
  });

  it("reloads the placement instead of following a replaced creative", async () => {
    serve({ clickStatus: 409, clickCode: "AD_CREATIVE_CHANGED" });
    renderBanner();
    const image = await screen.findByAltText("Iced latte on a table");
    fireEvent.load(image);
    placement = {
      slot,
      ads: [{ ...ad, revision_id: REPLACEMENT, alt_text: "Hot momo platter" }],
    };

    await userEvent.click(screen.getByRole("button", { name: /Sponsored: Dashain/ }));
    const replaced = await screen.findByAltText("Hot momo platter");
    expect(push).not.toHaveBeenCalled();
    expect(calls(`/placements/${SLOTS.homeTop}`)).toHaveLength(2);
    const revisions = calls("/image").map(([request]) =>
      new URL(request.url).searchParams.get("revision"),
    );
    expect(revisions).toEqual([ad.revision_id, REPLACEMENT]);

    // The replacement is a new creative: it counts once its own image has loaded.
    scrollTo(0.6);
    expect(calls("/rendered")).toHaveLength(0);
    fireEvent.load(replaced);
    scrollTo(0.6);
    await waitFor(() => expect(calls("/rendered")).toHaveLength(1));
    expect(await calls("/rendered")[0]?.[0].json()).toMatchObject({ revision: REPLACEMENT });
  });

  it("stays on the page when the ad is no longer available", async () => {
    serve({ clickStatus: 404 });
    renderBanner();
    await userEvent.click(await screen.findByRole("button", { name: /Sponsored: Dashain/ }));
    await waitFor(() => expect(calls("/click")).toHaveLength(1));
    expect(push).not.toHaveBeenCalled();
  });

  it("renders nothing when the placement fails or is empty", async () => {
    fetchMock.mockImplementation(async () => json({ status: 403, code: "FORBIDDEN" }, 403));
    const { container } = renderBanner();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("maps slot sizes to static aspect classes", () => {
    expect(aspectClass(1200, 300)).toBe("aspect-[4/1]");
    expect(aspectClass(600, 300)).toBe("aspect-[2/1]");
    expect(aspectClass(700, 300)).toBe("aspect-[2/1]");
  });
});
