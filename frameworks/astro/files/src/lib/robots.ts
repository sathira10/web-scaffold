import { site } from "@/data/site";

/** robots.txt body. A demo build disallows everything and advertises no sitemap. */
export function robotsTxt(demo: boolean = site.demo): string {
  if (demo) return "User-agent: *\nDisallow: /\n";
  return `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap-index.xml\n`;
}
