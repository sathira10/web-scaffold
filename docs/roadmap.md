# Roadmap

Things worth adding later. Most of them help once a site has real content, so they aren't part
of a fresh scaffold yet. Move an item to the CHANGELOG when it ships.

## Built-site checks (`check-site`)

- **Heading order.** Reject skipped levels (h2 → h4). Or turn on axe's `heading-order` rule in
  `modules/e2e/.../matrix.spec.ts`, which only runs the `wcag*` tags now.
- **Unique titles and descriptions.** Every page falls back to `site.description`, so a new page
  can share it with the rest. Require both to be unique across indexed pages, and warn on length
  (titles about 60 characters, descriptions about 160).
- **Orphan pages.** Flag a sitemap page that no other page links to.
- **URL slugs.** Routes use only lowercase letters, digits, hyphens and `/`. Blog slugs come from
  file names, so this catches `My Post.md`.

## Going live

- **Search Console and Bing Webmaster Tools.** Add a step to `skills/new-site/references/go-live.md`:
  verify the domain with a DNS record in Cloudflare and submit `sitemap-index.xml`.
- **HTTP to HTTPS on Cloudflare.** HSTS only takes effect after the first HTTPS visit. Note the
  zone's "Always Use HTTPS" setting in both `host-cf-*` `DEPLOYING.md` files. Firebase already
  redirects.

## Performance

- **Core Web Vitals.** Nothing measures them yet. Lighthouse CI with a budget is the obvious
  choice, but it adds a dependency and its runs are noisy, so only add it as an opt-in
  module or a CI job that warns without failing.

## Structured data

- **Post images and authors.** `BlogPosting` uses the site as author and has no image. Add
  optional `author`, `updated` and `image` frontmatter to the blog collection when a site needs
  them.
