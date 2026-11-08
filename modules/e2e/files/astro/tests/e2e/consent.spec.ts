import { expect, test } from "@playwright/test";

// Cookie-setting analytics (analytics module) must send nothing before consent, and a GA4
// page_view after it, with the campaign query kept. Skips when the build has no consent banner,
// which is the case unless PUBLIC_GA_MEASUREMENT_ID or PUBLIC_META_PIXEL_ID was set at build.
test("analytics wait for consent", async ({ page }) => {
  const tracked: string[] = [];
  page.on("request", (request) => {
    if (/google-analytics\.com|googletagmanager\.com|facebook\.(com|net)/.test(request.url()))
      tracked.push(request.url());
  });
  const cspErrors: string[] = [];
  page.on("console", (msg) => {
    if (/Content Security Policy|Refused to/.test(msg.text())) cspErrors.push(msg.text());
  });

  await page.goto("/?utm_source=e2e&utm_campaign=consent-check");
  const dialog = page.getByRole("dialog", { name: "Analytics consent" });
  await page.waitForTimeout(1000);
  test.skip(!(await dialog.isVisible()), "no cookie-setting analytics in this build");
  expect(tracked, "requests before consent").toEqual([]);

  await page.getByRole("button", { name: "Allow cookies" }).click();
  await expect.poll(() => tracked.length, { timeout: 10_000 }).toBeGreaterThan(0);
  // GA4 is configured when its loader was fetched: then a page_view must follow.
  if (tracked.some((url) => url.includes("googletagmanager.com/gtag/js"))) {
    await expect
      .poll(() => tracked.find((u) => u.includes("/g/collect") && u.includes("en=page_view")), {
        timeout: 15_000,
      })
      .toBeTruthy();
    const hit = decodeURIComponent(tracked.find((u) => u.includes("en=page_view")) ?? "");
    expect(hit).toContain("utm_campaign=consent-check");
  }
  expect(cspErrors).toEqual([]);
});
