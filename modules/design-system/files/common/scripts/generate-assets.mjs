// Writes favicons, app icons, a web manifest and the social image (public/og/og-home.png) from
// design-system/assets/mark.svg. Usage: pnpm assets
// The name and tagline come from src/data/site.ts. Colors come from --accent and --accent-fg,
// and the font from --font-heading, in design-system/tokens.css (hex values only: the SVG
// renderer reads no CSS variables).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const siteSource = readFileSync("src/data/site.ts", "utf8");
const tokens = readFileSync("design-system/tokens.css", "utf8");
const field = (name) => siteSource.match(new RegExp(`\\b${name}:\\s*"([^"]*)"`))?.[1];
const token = (name) => tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`))?.[1];
const font = tokens.match(/--font-heading:\s*([^;]+);/)?.[1]?.replace(/"/g, "'");

const BRAND = {
  name: field("name"),
  tagline: field("tagline") ?? field("description"),
  background: token("accent"),
  foreground: token("accent-fg"),
  font: font ?? "Helvetica, Arial, sans-serif",
};
for (const [key, value] of Object.entries(BRAND)) {
  if (!value) throw new Error(`generate-assets: could not read ${key} from site.ts / tokens.css`);
}

// Comments in the source mark (PLACEHOLDER notes, editor metadata) must not ship.
const mark = readFileSync("design-system/assets/mark.svg", "utf8").replace(/<!--[\s\S]*?-->/g, "");
const viewBox = mark.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 64 64";
const inner = mark
  .replace(/<\?xml[^>]*>|<svg[^>]*>|<\/svg>/g, "")
  .replace(/fill="[^"]*"/g, `fill="${BRAND.foreground}"`);
const markBox = `<svg width="64" height="64" viewBox="${viewBox}">${inner}</svg>`;
const icon = (size, radius = 0, pad = 0) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">` +
      `<rect width="64" height="64" rx="${radius}" fill="${BRAND.background}"/>` +
      `<g transform="translate(${pad} ${pad}) scale(${(64 - pad * 2) / 64})">${markBox}</g></svg>`,
  );

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const og = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">` +
    `<rect width="1200" height="630" fill="${BRAND.background}"/>` +
    `<g transform="translate(80 80) scale(2.5)">${markBox}</g>` +
    `<text x="80" y="400" font-family="${BRAND.font}" font-size="80" font-weight="700" fill="${BRAND.foreground}">${escape(BRAND.name)}</text>` +
    `<text x="80" y="470" font-family="${BRAND.font}" font-size="34" fill="${BRAND.foreground}" fill-opacity="0.8">${escape(BRAND.tagline.slice(0, 60))}</text></svg>`,
);

mkdirSync("public/og", { recursive: true });
writeFileSync("public/favicon.svg", icon(64, 12).toString() + "\n");
writeFileSync(
  "public/site.webmanifest",
  JSON.stringify(
    {
      name: BRAND.name,
      short_name: BRAND.name,
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      theme_color: BRAND.background,
      background_color: BRAND.background,
      display: "browser",
    },
    null,
    2,
  ) + "\n",
);
const png = (name, buffer) => sharp(buffer).png().toFile(`public/${name}`);
await Promise.all([
  png("favicon-32.png", icon(32, 6)),
  png("apple-touch-icon.png", icon(180, 0, 12)),
  png("icon-192.png", icon(192, 24)),
  png("icon-512.png", icon(512, 64)),
  png("icon-maskable-512.png", icon(512, 0, 10)),
  png("og/og-home.png", og),
]);
console.log("assets: wrote favicons, icons, site.webmanifest and og/og-home.png into public/");
