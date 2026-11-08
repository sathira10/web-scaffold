import { describe, expect, it } from "vitest";
import { site } from "@/data/site";
import { llmsTxt } from "@/lib/llms";
import { robotsTxt } from "@/lib/robots";
import { absoluteUrl, pageTitle, seo, serializeJsonLd } from "@/lib/seo";

describe("site", () => {
  it("has a clean https url without trailing slash", () => {
    expect(site.url).toMatch(/^https:\/\/[^/]+$/);
  });

  it("has a slug safe for storage keys", () => {
    expect(site.slug).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("seo", () => {
  it("builds absolute urls", () => {
    expect(absoluteUrl("/")).toBe(site.url);
    expect(absoluteUrl("/contact")).toBe(`${site.url}/contact`);
  });

  it("appends the site name to page titles", () => {
    expect(pageTitle({ title: "Contact" })).toBe(`Contact | ${site.name}`);
    expect(pageTitle({ fullTitle: "Exact" })).toBe("Exact");
  });

  it("emits canonical, og tags and home JSON-LD", () => {
    const home = seo({ path: "/" });
    expect(home.canonical).toBe(site.url);
    expect(home.meta.find((m) => m.property === "og:url")?.content).toBe(site.url);
    expect(home.jsonLd).toHaveLength(2);
    expect(seo({ path: "/about" }).jsonLd).toHaveLength(0);
  });

  it("writes image tags only when there is an image", () => {
    expect(seo().meta.some((m) => m.property === "og:image")).toBe(false);
    expect(seo({ image: "/og/a.png" }).meta.find((m) => m.property === "og:image")?.content).toBe(
      `${site.url}/og/a.png`,
    );
  });

  it("adds noindex when asked, and on every page of a demo build", () => {
    expect(seo({ noindex: true }).meta.some((m) => m.name === "robots")).toBe(true);
    expect(seo().meta.some((m) => m.name === "robots")).toBe(site.demo);
  });

  it("cannot close its own script tag", () => {
    expect(serializeJsonLd({ a: "</script>" })).not.toContain("</script>");
  });
});

describe("robots.txt", () => {
  it("disallows everything in a demo build", () => {
    expect(robotsTxt(true)).toBe("User-agent: *\nDisallow: /\n");
  });

  it("points to the sitemap otherwise", () => {
    expect(robotsTxt(false)).toContain(`Sitemap: ${site.url}/sitemap-index.xml`);
  });
});

describe("llms.txt", () => {
  it("lists nothing in a demo build", () => {
    expect(llmsTxt([{ heading: "Posts", links: [{ title: "A", path: "/a" }] }], true)).not.toContain(
      "##",
    );
  });

  it("lists the nav pages and module sections otherwise", () => {
    const posts = [{ title: "A [1]", path: "/a", description: "About A" }];
    const text = llmsTxt([{ heading: "Posts", links: posts }], false);
    expect(text).toMatch(new RegExp(`^# ${site.name}\n\n> `));
    expect(text).toContain(`## Pages\n\n- [Home](${site.url})`);
    expect(text).toContain(`- [A \\[1\\]](${site.url}/a): About A`);
  });

  it("leaves out empty sections", () => {
    expect(llmsTxt([{ heading: "Posts", links: [] }], false)).not.toContain("## Posts");
  });
});
