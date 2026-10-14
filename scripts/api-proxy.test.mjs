import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { test } from "node:test";

// Next normally installs this global while bootstrapping its server.
globalThis.AsyncLocalStorage = AsyncLocalStorage;
process.env.API_PROXY_TARGET = "http://backend.test";

const { default: nextConfig } = await import("../next.config.ts");
const { unstable_getResponseFromNextConfig, getRewrittenUrl } =
  await import("next/experimental/testing/server.js");

for (const path of [
  "/api/v1/users/auth/password-setup/resend/",
  "/api/v1/users/auth/password-setup/MQ/token/",
  "/api/v1/auth/login",
  "/api/v1/me/notifications/unread-count",
  "/api/v1/users/auth/password-setup/resend/?source=setup",
]) {
  test(`API proxy preserves ${path}`, async () => {
    const response = await unstable_getResponseFromNextConfig({
      url: `http://localhost:3000${path}`,
      nextConfig,
    });
    assert.equal(response.headers.get("location"), null);
    assert.equal(getRewrittenUrl(response), `http://backend.test${path}`);
  });
}
