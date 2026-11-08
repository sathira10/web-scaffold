/** Paths kept out of the sitemap. Every page that sets `noindex` belongs here. */
export const unlisted = ["/404"];

/** Astro file builds expose `.html` (and `/index`) in Astro.url; public routes omit them. */
export function routePath(path: string): string {
  return (
    path
      .replace(/\.html$/, "")
      .replace(/\/index$/, "")
      .replace(/\/$/, "") || "/"
  );
}

/** True when `href` is the current page or a section that contains it. */
export function isCurrent(path: string, href: string): boolean {
  const current = routePath(path);
  if (href === "/") return current === "/";
  return current === href || current.startsWith(`${href}/`);
}
