import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { health } from "./routes/health";

// Only /api/* reaches this Worker (run_worker_first in wrangler.jsonc). Every other path is a
// static asset or the SPA's index.html, with headers from public/_headers. API responses get
// their headers here, because public/_headers never applies to Worker responses.
export function createApp() {
  const app = new Hono<{ Bindings: Env }>().basePath("/api");
  app.use(
    "*",
    secureHeaders({
      contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      strictTransportSecurity: "max-age=31536000",
    }),
  );
  app.route("/health", health);
  app.notFound((c) => c.json({ error: "not_found" }, 404));
  return app;
}
