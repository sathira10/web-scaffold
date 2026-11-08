import { mkdirSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { routes } from "./routes";

// Two tests per route: layout and axe. Each loops over its cases and reports every failing one.
// Screenshots only when a label is given: `AUDIT_LABEL=before pnpm audit:matrix`.
const label = process.env.AUDIT_LABEL;
const shotDir = label ? `.audit/${label}` : null;
if (shotDir) mkdirSync(shotDir, { recursive: true });

const widths = [320, 360, 390, 768, 1024, 1440];
const themes = ["light", "dark"] as const;
// WCAG 1.4.4 asks for 200% text without loss; phones' large-text settings reach 150-200%.
const textSizes = [
  [390, "150%"],
  [390, "200%"],
  [1280, "200%"],
] as const;
const slug = (route: string) => (route === "/" ? "home" : route.slice(1).replaceAll("/", "-"));

// Wider than the viewport means the page scrolls sideways.
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function check(page: Page, failures: string[], name: string) {
  if (shotDir) await page.screenshot({ path: `${shotDir}/${name}.png`, fullPage: true });
  const px = await overflow(page);
  if (px > 0) failures.push(`${name}: ${px}px sideways scroll`);
}

for (const route of routes) {
  test.describe(route, () => {
    test("has no sideways scroll", async ({ page }) => {
      const failures: string[] = [];
      for (const theme of themes) {
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await page.goto(route);
        for (const width of widths) {
          await page.setViewportSize({ width, height: 800 });
          await check(page, failures, `${slug(route)}-${width}-${theme}`);
        }
      }

      await page.emulateMedia({ colorScheme: "light" });
      for (const [width, size] of textSizes) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(route);
        // Set through the CSSOM: the CSP rightly blocks an injected <style>.
        await page.evaluate((s) => document.documentElement.style.setProperty("font-size", s), size);
        await check(page, failures, `${slug(route)}-${width}-text${parseInt(size)}`);
      }

      await page.setViewportSize({ width: 390, height: 800 });
      await page.emulateMedia({ forcedColors: "active" });
      await page.goto(route);
      await check(page, failures, `${slug(route)}-390-forced-colors`);

      expect(failures).toEqual([]);
    });

    test("passes axe", async ({ page }) => {
      const failures: string[] = [];
      for (const theme of themes) {
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        for (const width of [360, 1280]) {
          await page.setViewportSize({ width, height: 800 });
          await page.goto(route);
          const { violations } = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
            .analyze();
          for (const v of violations)
            if (v.impact === "serious" || v.impact === "critical")
              failures.push(
                `${width} ${theme} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
              );
        }
      }
      expect(failures).toEqual([]);
    });
  });
}
