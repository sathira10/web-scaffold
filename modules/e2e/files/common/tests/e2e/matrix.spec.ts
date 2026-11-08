import { mkdirSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { routes } from "./routes";

// Screenshots only when a label is given: `AUDIT_LABEL=before pnpm audit:matrix`.
const label = process.env.AUDIT_LABEL;
const shotDir = label ? `.audit/${label}` : null;
if (shotDir) mkdirSync(shotDir, { recursive: true });

const widths = [320, 360, 390, 768, 1024, 1440];
const themes = ["light", "dark"] as const;
const slug = (route: string) => (route === "/" ? "home" : route.slice(1).replaceAll("/", "-"));

// Wider than the viewport means the page scrolls sideways.
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function shoot(page: Page, name: string) {
  if (shotDir) await page.screenshot({ path: `${shotDir}/${name}.png`, fullPage: true });
}

for (const route of routes) {
  test.describe(route, () => {
    for (const theme of themes) {
      for (const width of widths) {
        test(`${width} ${theme} has no sideways scroll`, async ({ page }) => {
          await page.setViewportSize({ width, height: 800 });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
          await page.goto(route);
          await shoot(page, `${slug(route)}-${width}-${theme}`);
          expect(await overflow(page)).toBeLessThanOrEqual(0);
        });
      }

      for (const width of [360, 1280]) {
        test(`${width} ${theme} passes axe`, async ({ page }) => {
          await page.setViewportSize({ width, height: 800 });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
          await page.goto(route);
          const { violations } = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
            .analyze();
          const serious = violations
            .filter((v) => v.impact === "serious" || v.impact === "critical")
            .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
          expect(serious).toEqual([]);
        });
      }
    }

    // WCAG 1.4.4 asks for 200% text without loss; phones' large-text settings reach 150-200%.
    for (const [width, size] of [
      [390, "150%"],
      [390, "200%"],
      [1280, "200%"],
    ] as const) {
      test(`${width} at ${size} text has no sideways scroll`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(route);
        // Set through the CSSOM: the CSP rightly blocks an injected <style>.
        await page.evaluate((s) => document.documentElement.style.setProperty("font-size", s), size);
        await shoot(page, `${slug(route)}-${width}-text${parseInt(size)}`);
        expect(await overflow(page)).toBeLessThanOrEqual(0);
      });
    }

    test("390 in forced colors has no sideways scroll", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 800 });
      await page.emulateMedia({ forcedColors: "active" });
      await page.goto(route);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
    });
  });
}
