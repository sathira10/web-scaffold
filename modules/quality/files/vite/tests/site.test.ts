import { describe, expect, it } from "vitest";
import { site } from "../src/data/site";

describe("site", () => {
  it("has a slug safe for storage keys", () => {
    expect(site.slug).toMatch(/^[a-z0-9-]+$/);
  });
});
