import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The Cloudflare plugin runs src/worker in workerd beside the dev server, and builds the app and
// the Worker together. `pnpm preview` serves both, as deployed.
export default defineConfig({
  plugins: [react(), tailwind(), cloudflare()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Expose only PUBLIC_* variables to the browser.
  envPrefix: "PUBLIC_",
  // Keep assets in hashed files; the CSP allows no data: fonts or inline scripts.
  build: { assetsInlineLimit: 0 },
});
