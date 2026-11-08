import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import process from "node:process";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";
import { site } from "./src/data/site";
import { unlisted } from "./src/lib/routes";

const env = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "PUBLIC_");

// Third-party origins. Each service has one file in config/csp/. A file's origins join the
// policy only when its environment variable is set and valid, so an unconfigured service adds
// nothing to the policy.
const csp = {
  script: ["'self'"],
  connect: ["'self'"],
  img: ["'self'", "data:"],
  frame: [],
  form: ["'self'"],
};
const cspDir = new URL("./config/csp/", import.meta.url);
for (const file of existsSync(cspDir) ? readdirSync(cspDir).sort() : []) {
  if (!file.endsWith(".json")) continue;
  const entry = JSON.parse(readFileSync(new URL(file, cspDir), "utf8"));
  if (entry.env && !new RegExp(entry.pattern ?? ".").test(env[entry.env] ?? "")) continue;
  for (const key of Object.keys(csp)) csp[key].push(...(entry[key] ?? []));
}

// A demo build tells crawlers to stay away in the response headers too. Cloudflare joins the
// headers of every matching rule, so a second `/*` block adds to the first.
const demoHeaders = {
  name: "demo-headers",
  hooks: {
    "astro:build:done": ({ dir }) => {
      const file = new URL("_headers", dir);
      if (site.demo && existsSync(file)) {
        appendFileSync(file, "\n/*\n  X-Robots-Tag: noindex, nofollow\n");
      }
    },
  },
};

export default defineConfig({
  site: site.url,
  output: "static",
  // Workers and Firebase serve /about from about.html, without a trailing slash.
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [
    react(),
    // A demo build has no sitemap. Pages that carry noindex stay out of it.
    ...(site.demo
      ? []
      : [sitemap({ filter: (page) => !unlisted.includes(new URL(page).pathname) })]),
    demoHeaders,
  ],
  // Prism writes CSS classes; Shiki writes inline styles, which the CSP blocks.
  markdown: { syntaxHighlight: "prism" },
  // Astro hashes the scripts it emits and writes a CSP <meta> tag per page, so script-src needs
  // no 'unsafe-inline'. The host's headers add what a meta tag cannot express (frame-ancestors).
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        `img-src ${csp.img.join(" ")}`,
        "font-src 'self'",
        `connect-src ${csp.connect.join(" ")}`,
        `frame-src ${csp.frame.length ? csp.frame.join(" ") : "'none'"}`,
        "object-src 'none'",
        "base-uri 'self'",
        `form-action ${csp.form.join(" ")}`,
      ],
      scriptDirective: { resources: csp.script },
    },
  },
  vite: {
    plugins: [tailwind()],
    // Expose only PUBLIC_* variables to the browser.
    envPrefix: "PUBLIC_",
    // Keep scripts and fonts in hashed files so the CSP never needs data: or unsafe-inline.
    build: { assetsInlineLimit: 0 },
  },
});
