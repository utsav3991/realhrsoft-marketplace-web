import { expect, test } from "@playwright/test";

const organizationId = "00000000-0000-4000-8000-000000000001";

for (const mobile of [false, true]) {
  test(`impersonation leaves the workspace switcher usable (${mobile ? "mobile" : "desktop"})`, async ({
    page,
  }) => {
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 });
    await page.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = { count: 0, results: [] };
      if (path.endsWith("/auth/refresh"))
        body = { access_token: "partner-token", expires_in: 1800 };
      if (path.endsWith("/auth/me"))
        body = {
          actor_id: "partner",
          actor_type: "partner",
          authentication_source: "impersonation",
          roles: [],
          permissions: [],
          organization_id: organizationId,
          organization_permissions: [],
          memberships: [
            { organization_id: organizationId, name: "Merchant", employer: false, partner: true },
          ],
          client_id: null,
          client_permissions: [],
          clients: [],
          superuser: false,
          impersonator: { actor_id: "admin", email: "administrator@example.com" },
        };
      if (path.endsWith("/unread-count")) body = { unread: 0 };
      if (path.endsWith("/notification-preferences")) body = { email_enabled: true };
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto("/partner/notifications");
    const banner = page.getByRole("complementary", { name: "Impersonation session" });
    await expect(banner).toBeVisible();
    if (mobile) await page.getByRole("button", { name: "Toggle sidebar" }).click();
    const switcher = page.getByRole("button", { name: "Switch workspace" });
    await expect(switcher).toBeVisible();
    if (!mobile) {
      const bannerBox = await banner.boundingBox();
      const switcherBox = await switcher.boundingBox();
      expect(switcherBox!.y).toBeGreaterThanOrEqual(bannerBox!.y + bannerBox!.height);
      // The rail must remain in view when long page content scrolls.
      await page.locator('[data-slot="application-content"]').evaluate((element) => {
        const filler = document.createElement("div");
        filler.style.height = "2000px";
        element.querySelector("main")?.append(filler);
        element.scrollTop = 500;
      });
    }
    await switcher.click();
    await page.getByRole("menuitem", { name: "Business Portal" }).click();
    await expect(page).toHaveURL(/\/business$/);
  });
}
