import { fileURLToPath } from "node:url";
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

// Two projects: unit tests run in Node, and tests/worker runs inside workerd with the bindings
// from wrangler.jsonc, so a Worker test exercises the real handler.
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/e2e/**", "tests/worker/**"],
          environment: "node",
        },
      },
      {
        plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
        resolve: { alias },
        test: { name: "worker", include: ["tests/worker/**/*.test.ts"] },
      },
    ],
  },
});
