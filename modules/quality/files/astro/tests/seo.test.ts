import { describe, expect, it } from "vitest";
import { site } from "@/data/site";
import { llmsTxt } from "@/lib/llms";
import { robotsTxt } from "@/lib/robots";
import { absoluteUrl, articleJsonLd, pageTitle, seo, serializeJsonLd } from "@/lib/seo";

describe("seo", () => {
  it("has a clean https url and a slug safe for storage keys", () => {
    expect(site.url).toMatch(/^https:\/\/[^/]+$/);
    expect(site.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("builds urls, titles, canonical, og tags, JSON-LD and noindex", () => {
    expect(absoluteUrl("/")).toBe(site.url);
    expect(absoluteUrl("/contact")).toBe(`${site.url}/contact`);
    expect(pageTitle({ title: "Contact" })).toBe(`Contact | ${site.name}`);
    expect(pageTitle({ fullTitle: "Exact" })).toBe("Exact");

    const home = seo({ path: "/" });
    expect(home.canonical).toBe(site.url);
    expect(home.meta.find((m) => m.property === "og:url")?.content).toBe(site.url);
    expect(home.jsonLd).toHaveLength(2);
    expect(seo({ path: "/about" }).jsonLd).toHaveLength(0);

    expect(seo().meta.some((m) => m.property === "og:image")).toBe(false);
    expect(seo({ image: "/og/a.png" }).meta.find((m) => m.property === "og:image")?.content).toBe(
      `${site.url}/og/a.png`,
    );

    // Every page of a demo build is noindex.
    expect(seo({ noindex: true }).meta.some((m) => m.name === "robots")).toBe(true);
    expect(seo().meta.some((m) => m.name === "robots")).toBe(site.demo);
  });

  it("describes an article, and JSON-LD can't close its own script tag", () => {
    const published = new Date("2026-01-02T00:00:00Z");
    const article = articleJsonLd({ title: "T", description: "D", path: "/blog/t", published });
    expect(article["@type"]).toBe("BlogPosting");
    expect(article.url).toBe(`${site.url}/blog/t`);
    expect(article.datePublished).toBe(published.toISOString());
    expect(article.dateModified).toBe(published.toISOString());
    expect(serializeJsonLd({ a: "</script>" })).not.toContain("</script>");
  });

  it("writes robots.txt: block everything on a demo, point to the sitemap otherwise", () => {
    expect(robotsTxt(true)).toBe("User-agent: *\nDisallow: /\n");
    expect(robotsTxt(false)).toContain(`Sitemap: ${site.url}/sitemap-index.xml`);
  });

  it("writes llms.txt: empty on a demo, nav pages and non-empty sections otherwise", () => {
    const posts = [{ title: "A [1]", path: "/a", description: "About A" }];
    expect(llmsTxt([{ heading: "Posts", links: posts }], true)).not.toContain("##");
    const text = llmsTxt([{ heading: "Posts", links: posts }], false);
    expect(text).toMatch(new RegExp(`^# ${site.name}\n\n> `));
    expect(text).toContain(`## Pages\n\n- [Home](${site.url})`);
    expect(text).toContain(`- [A \\[1\\]](${site.url}/a): About A`);
    expect(llmsTxt([{ heading: "Posts", links: [] }], false)).not.toContain("## Posts");
  });
});
