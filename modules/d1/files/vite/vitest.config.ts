import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

// Two projects: unit tests run in Node, and tests/worker runs inside workerd with a real local
// D1. Migrations are read here and applied in tests/worker/setup.ts, so every Worker test sees
// the current schema.
export default defineConfig(async () => {
  const migrations = await readD1Migrations("src/db/migrations");
  return {
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
          plugins: [
            cloudflareTest({
              wrangler: { configPath: "./wrangler.jsonc" },
              miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
            }),
          ],
          resolve: { alias },
          test: {
            name: "worker",
            include: ["tests/worker/**/*.test.ts"],
            setupFiles: ["tests/worker/setup.ts"],
          },
        },
      ],
    },
  };
});
