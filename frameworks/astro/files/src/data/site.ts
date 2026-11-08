// Single source of truth for every fact on the site: names, contact details, prices, dates.
// Pages read from here and never hard-code a fact. A missing fact is left out, not guessed.

export type NavItem = { href: string; label: string };

export const site = {
  // Production URL, no trailing slash.
  url: "__URL__",
  name: "__NAME__",
  // Short, safe for storage keys.
  slug: "__SLUG__",
  tagline: "__TAGLINE__",
  description: "__DESCRIPTION__",
  email: "__EMAIL__",
  locale: "__LOCALE__",
  // Social image; `pnpm assets` writes it when the design-system module is installed.
  ogImage: "/og/og-home.png",
  // Demo build: every page is noindex, robots.txt disallows all and there is no sitemap.
  // `node <web-scaffold>/create.mjs go-live` sets it to false.
  demo: false,
  social: {} as Record<string, string>,
  nav: [
    // nav:start (create.mjs adds module pages here)
    { href: "/", label: "Home" },
    // nav:end
  ] as NavItem[],
};

export type Site = typeof site;

export function mailto(subject?: string): string {
  return subject
    ? `mailto:${site.email}?subject=${encodeURIComponent(subject)}`
    : `mailto:${site.email}`;
}
