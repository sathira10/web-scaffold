# Deploying

Hosting is Cloudflare Workers with static assets
([docs](https://developers.cloudflare.com/workers/static-assets/)). `pnpm build` writes `dist/`
and `wrangler.jsonc` serves it from one Worker, `__SLUG__`. Workers Builds deploys it from
GitHub ([Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)): a push to `main`
deploys production, and every other branch gets a preview URL
([previews](https://developers.cloudflare.com/workers/configuration/previews/)). There is no
staging Worker; previews replace it.

## One-time setup

1. Push the repo to GitHub.
2. Deploy once from this machine so the Worker exists: `pnpm wrangler login`, then
   `pnpm deploy`.
3. In the Cloudflare dashboard, open the Worker, go to Settings, Builds, and connect the repo:

| Tab           | Setting                     | Value                          |
| ------------- | --------------------------- | ------------------------------ |
| Production    | Branch                      | `main`                         |
| Production    | Build command               | `pnpm build`                   |
| Production    | Deploy command              | `npx wrangler deploy`          |
| Previews Base | Builds for Preview branches | On                             |
| Previews Base | Build command               | `pnpm build`                   |
| Previews Base | Preview command             | `npx wrangler versions upload` |

4. Set the public variables from `.env.example` (if there is one) as build variables.
5. Add the custom domain under Settings, Domains & Routes
   ([custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)).

Not `npx wrangler preview`: that command needs a `previews` block in `wrangler.jsonc` and never
deploys production.

## Flow

1. Work on a branch and open a pull request into `main`.
2. Workers Builds uploads a preview version and comments its URL on the pull request. Check the
   site there.
3. Merge. The push to `main` deploys production.

`pnpm deploy` builds and deploys production from this machine. Use it only when Builds is down.

## Checks

- `pnpm wrangler deploy --dry-run` validates the config without publishing.
- `public/_headers` sets the security headers and asset caching
  ([headers](https://developers.cloudflare.com/workers/static-assets/headers/)). It applies to
  static assets only; Worker code sets its own headers.
- After a deploy, load the site with the browser console open and check there are no CSP
  violations.

## Rollback

`pnpm wrangler rollback`, or redeploy the previous commit.
