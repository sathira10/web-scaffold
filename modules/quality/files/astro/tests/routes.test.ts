import { describe, expect, it } from "vitest";
import { isCurrent, routePath } from "@/lib/routes";

describe("routePath", () => {
  it("drops the .html and /index a file build exposes", () => {
    expect(routePath("/about.html")).toBe("/about");
    expect(routePath("/index.html")).toBe("/");
    expect(routePath("/blog/index.html")).toBe("/blog");
    expect(routePath("/blog/")).toBe("/blog");
    expect(routePath("/")).toBe("/");
  });
});

describe("isCurrent", () => {
  it("matches the page and the section it belongs to", () => {
    expect(isCurrent("/blog/first.html", "/blog")).toBe(true);
    expect(isCurrent("/about.html", "/about")).toBe(true);
    expect(isCurrent("/about.html", "/")).toBe(false);
    expect(isCurrent("/index.html", "/")).toBe(true);
    expect(isCurrent("/blogger", "/blog")).toBe(false);
  });
});
