import { defineConfig, devices } from "@playwright/test";

// Browser tests against the built site: the layout matrix and axe. Kept out of `pnpm check`
// because they need a browser; run `pnpm test:e2e` (CI runs it).
// Set E2E_PORT when another project already uses this port.
const port = Number(process.env.E2E_PORT ?? 4391);

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${port}`, ...devices["Desktop Chrome"] },
  projects: [{ name: "chromium" }],
  webServer: {
    // --ignore-lock keeps Astro's preview server in the foreground, where Playwright can stop it.
    command: `pnpm build && pnpm preview --port ${port} --ignore-lock`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
