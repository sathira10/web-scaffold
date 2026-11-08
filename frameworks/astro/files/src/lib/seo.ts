import { site } from "@/data/site";

export type SeoInput = {
  /** Page title without the site name; the site name is appended unless `fullTitle` is set. */
  title?: string;
  fullTitle?: string;
  description?: string;
  /** Route path, e.g. "/contact". Empty string or "/" for home. Drives canonical and og:url. */
  path?: string;
  /** Social image path relative to the site URL. Left out when the site has none yet. */
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  noindex?: boolean;
};

export type MetaTag = { name?: string; property?: string; content: string };

export type Seo = {
  title: string;
  meta: MetaTag[];
  canonical: string;
  jsonLd: Record<string, unknown>[];
};

export function absoluteUrl(path = ""): string {
  const clean = path === "/" ? "" : path;
  return `${site.url}${clean}`;
}

export function pageTitle({ title, fullTitle }: Pick<SeoInput, "title" | "fullTitle">): string {
  if (fullTitle) return fullTitle;
  return title ? `${title} | ${site.name}` : `${site.name}: ${site.tagline}`;
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    email: site.email,
    description: site.description,
    sameAs: Object.values(site.social),
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    inLanguage: site.locale,
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function seo(input: SeoInput = {}): Seo {
  const title = pageTitle(input);
  const description = input.description ?? site.description;
  const url = absoluteUrl(input.path);

  const meta: MetaTag[] = [
    { name: "description", content: description },
    { property: "og:site_name", content: site.name },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: input.type ?? "website" },
    { property: "og:url", content: url },
    { name: "twitter:card", content: input.image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
  if (input.image) {
    const image = absoluteUrl(input.image);
    meta.push(
      { property: "og:image", content: image },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: input.imageAlt ?? title },
      { name: "twitter:image", content: image },
    );
  }
  // A demo build is kept out of every index; see site.demo.
  if (input.noindex || site.demo) meta.push({ name: "robots", content: "noindex, nofollow" });

  const isHome = !input.path || input.path === "/";
  return {
    title,
    meta,
    canonical: url,
    jsonLd: isHome ? [organizationJsonLd(), websiteJsonLd()] : [],
  };
}

/** JSON-LD must not be able to close its own script tag. */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
