import { File as NodeFile } from "node:buffer";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setActiveOrganizationId } from "@/shared/api";

import { uploadAsset } from "./mutations";
import { ADMIN_WORKSPACE, partnerWorkspace } from "./queries";

const ORG = "4a293c96-2952-43ac-bf39-bdfda7531c48";
const PARTNER = "0b0b5e3c-3c3f-4bd6-9a55-8f3b7f0a8f2e";
const fetchMock = vi.fn<(request: Request) => Promise<Response>>();

const asset = {
  id: "0d8a6c2e-1b3f-4a5d-9e7c-2f4b6d8a0c1e",
  owner_organization_id: ORG,
  original_name: "banner.png",
  content_type: "image/png",
  size_bytes: 3,
  width: 2400,
  height: 600,
  sha256: "",
  created_at: "2026-09-29T09:00:00Z",
};

/**
 * jsdom's File and FormData cannot be sent through Node's Request, which the tests' fetch
 * uses; a browser has one realm. Swap in Node's classes (FormData taken from a parsed body).
 */
async function useNodeFormData() {
  vi.stubGlobal("File", NodeFile);
  const body =
    '--x\r\nContent-Disposition: form-data; name="f"; filename="f.png"\r\n\r\npng\r\n--x--\r\n';
  const parsed = await new Response(body, {
    headers: { "Content-Type": "multipart/form-data; boundary=x" },
  }).formData();
  vi.stubGlobal("FormData", parsed.constructor);
}

beforeEach(async () => {
  await useNodeFormData();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(asset), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
  );
});
afterEach(() => {
  setActiveOrganizationId(null);
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

const file = () => new NodeFile(["png"], "banner.png", { type: "image/png" }) as unknown as File;

function sent(): Request {
  const call = fetchMock.mock.calls[0];
  if (!call) throw new Error("nothing was sent");
  return call[0];
}

describe("uploadAsset", () => {
  it("sends multipart form data, never JSON, in the selected organization", async () => {
    setActiveOrganizationId(ORG);
    await expect(uploadAsset(partnerWorkspace(ORG), { file: file() })).resolves.toEqual(asset);
    const request = sent();
    expect(new URL(request.url).pathname).toBe("/api/v1/partner/marketing/creative-assets");
    expect(request.headers.get("Content-Type")).toMatch(/^multipart\/form-data; boundary=/);
    expect(request.headers.get("X-Organization-ID")).toBe(ORG);
    const form = await request.formData();
    expect((form.get("file") as File).name).toBe("banner.png");
    expect(form.has("partner_id")).toBe(false);
  });

  it("names the partner when an administrator uploads", async () => {
    await uploadAsset(ADMIN_WORKSPACE, { file: file(), partnerId: PARTNER });
    const request = sent();
    expect(new URL(request.url).pathname).toBe("/api/v1/admin/marketing/creative-assets");
    expect((await request.formData()).get("partner_id")).toBe(PARTNER);
    await expect(uploadAsset(ADMIN_WORKSPACE, { file: file() })).rejects.toThrow(/partner/);
  });
});
