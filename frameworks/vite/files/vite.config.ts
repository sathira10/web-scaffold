import { fileURLToPath } from "node:url";
import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Expose only PUBLIC_* variables to the browser.
  envPrefix: "PUBLIC_",
  // Keep assets in hashed files; the CSP allows no data: fonts or inline scripts.
  build: { assetsInlineLimit: 0 },
});
