# Deploying

Hosting is Cloudflare Workers with static assets
([docs](https://developers.cloudflare.com/workers/static-assets/)). `pnpm build` writes `dist/`
and `wrangler.jsonc` serves it from one Worker, `__SLUG__`. Deploys run by hand from this
machine.

## First deploy

1. `pnpm wrangler login` (opens the browser once).
2. `pnpm wrangler deploy --dry-run` checks the config without publishing.
3. `pnpm deploy` builds and deploys. Wrangler prints the `*.workers.dev` address
   ([commands](https://developers.cloudflare.com/workers/wrangler/commands/)).

## Custom domain

Add it to the Worker in the dashboard under Settings, Domains & Routes
([custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)),
or with a `routes` entry in `wrangler.jsonc`.

## Headers and redirects

`public/_headers` sets the security headers and asset caching
([headers](https://developers.cloudflare.com/workers/static-assets/headers/)).
`public/_redirects` holds redirects
([redirects](https://developers.cloudflare.com/workers/static-assets/redirects/)). Both apply
to static assets only; Worker code sets its own headers.

After a deploy, load the site with the browser console open and check there are no CSP
violations.

## Moving to Git deploys

When the site goes to production, switch to Workers Builds: every push to `main` deploys and
every branch gets a preview URL. `node <web-scaffold>/create.mjs go-live --hosting cf-git`
(for a demo) swaps this file and the config.

## Rollback

`pnpm wrangler rollback`, or deploy the previous commit again.
