import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeQueryClient, type Schemas } from "@/shared/api";

import { adBody, adSchema, EMPTY_AD, destinationView, type AdValues } from "../schemas/advertisement";
import { ServedAdPage } from "./ad-page";

const AD_ID = "6a1c9d2e-4b7f-4e3a-8c5d-1f2e3a4b5c6d";
const REVISION_ID = "5e7c9a1b-3d5f-4b7a-8c9e-1a3c5e7a9b2d";
const OFFER_ID = "2e3d4c5b-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const SLOT = "marketplace.home.top";

const page: Schemas["AdPage"] = {
  id: AD_ID,
  revision_id: REVISION_ID,
  sponsor: "Himalayan Java",
  headline: "Dashain coffee week",
  alt_text: "Iced latte on a table",
  has_image: true,
  title: "Dashain coffee week at Himalayan Java",
  body: "Every iced drink is 20% off.\n\nAt every outlet.",
  action: { label: "Get the offer", target: "internal", url: `/marketplace/offers/${OFFER_ID}` },
};

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" },
  });
}

function serve(answer: Response | (() => Response)) {
  fetchMock.mockImplementation(async (request) => {
    const path = new URL(request.url).pathname;
    if (path.endsWith(`/advertisements/${AD_ID}/page`)) {
      return typeof answer === "function" ? answer() : answer;
    }
    if (path.endsWith("/image")) {
      return new Response(new Blob(["png"], { type: "image/png" }), {
        headers: { "Content-Type": "image/png" },
      });
    }
    return json({}, 404);
  });
}

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <ServedAdPage adId={AD_ID} slotKey={SLOT} revisionId={REVISION_ID} />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("advertisement page", () => {
  it("shows the served revision as a labelled, plain-text page", async () => {
    serve(() => json(page));
    renderPage();
    expect(
      await screen.findByRole("heading", { level: 1, name: page.title }),
    ).toBeVisible();
    expect(screen.getByText("Sponsored")).toBeVisible();
    expect(screen.getByText("Himalayan Java")).toBeVisible();
    // Line breaks are kept; the body is text, never markup.
    expect(screen.getByText(/Every iced drink is 20% off\./).textContent).toBe(page.body);
    expect(await screen.findByAltText("Iced latte on a table")).toBeVisible();
    expect(screen.getByRole("link", { name: /Get the offer/ })).toHaveAttribute(
      "href",
      `/marketplace/offers/${OFFER_ID}`,
    );

    const request = fetchMock.mock.calls[0]![0];
    const query = new URL(request.url).searchParams;
    expect(query.get("slot")).toBe(SLOT);
    expect(query.get("revision")).toBe(REVISION_ID);
  });

  it("opens an external action in a new tab and ignores unexpected links", async () => {
    serve(() =>
      json({
        ...page,
        has_image: false,
        action: { label: "", target: "external", url: "https://himalayanjava.example/dashain" },
      }),
    );
    const { unmount } = renderPage();
    const link = await screen.findByRole("link", { name: /Visit website/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    unmount();

    serve(() =>
      json({ ...page, has_image: false, action: { label: "Go", target: "internal", url: "//evil.example" } }),
    );
    renderPage();
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("link", { name: /Go/ })).toBeNull();
  });

  it("explains a changed or unavailable promotion", async () => {
    serve(() => json({ status: 409, code: "AD_CREATIVE_CHANGED", title: "Changed" }, 409));
    const { unmount } = renderPage();
    expect(await screen.findByText("This promotion was updated")).toBeVisible();
    unmount();

    serve(() => json({ status: 404, code: "NOT_FOUND", title: "Not found" }, 404));
    renderPage();
    expect(await screen.findByText("Promotion not available")).toBeVisible();
  });
});

describe("advertisement page form values", () => {
  const values: AdValues = {
    ...EMPTY_AD,
    name: "Page ad",
    creativeType: "text_card",
    headline: "Coffee week",
    destinationType: "ad_page",
    pageTitle: "Coffee week",
    pageBody: "20% off.",
    slotKeys: [SLOT],
  };

  it("requires a title and text, and a link only when the page has a button", () => {
    expect(adSchema.safeParse(values).success).toBe(true);
    const missing = adSchema.safeParse({ ...values, pageTitle: "", pageBody: "" });
    expect(missing.error?.issues.map((issue) => issue.path[0])).toEqual(["pageTitle", "pageBody"]);
    const noOffer = adSchema.safeParse({ ...values, pageAction: "offer" });
    expect(noOffer.error?.issues.map((issue) => issue.path[0])).toEqual(["offerId"]);
  });

  it("sends only the page's own fields and reads them back", () => {
    expect(adBody({ ...values, url: "https://stale.example", actionLabel: "Stale" }).destination).toEqual({
      title: "Coffee week",
      body: "20% off.",
    });
    const withOffer = adBody({ ...values, pageAction: "offer", offerId: OFFER_ID, actionLabel: "Get it" });
    expect(withOffer.destination).toEqual({
      title: "Coffee week",
      body: "20% off.",
      offer_id: OFFER_ID,
      action_label: "Get it",
    });
    const revision = {
      destination_type: "ad_page",
      destination: { schema_version: 1, ...withOffer.destination },
    } as unknown as Schemas["AdRevision"];
    expect(destinationView(revision)).toEqual({
      type: "ad_page",
      page: {
        title: "Coffee week",
        body: "20% off.",
        action: "offer",
        url: "",
        offerId: OFFER_ID,
        actionLabel: "Get it",
      },
    });
  });
});
