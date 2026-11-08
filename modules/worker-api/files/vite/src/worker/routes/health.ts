import { Hono } from "hono";
import type { HealthResponse } from "../../shared/health";

export const health = new Hono<{ Bindings: Env }>().get("/", (c) =>
  c.json({ ok: true } satisfies HealthResponse),
);
