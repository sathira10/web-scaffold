import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("GET /api/health", () => {
  it("reports the Worker and D1 as up, with the security headers", async () => {
    const response = await exports.default.fetch("https://app.test/api/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, db: true });
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("answers unknown API paths with a JSON 404", async () => {
    const response = await exports.default.fetch("https://app.test/api/nope");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });
});
