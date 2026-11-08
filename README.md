# web-scaffold

Start websites and web apps from a small base plus tested modules. You can run it by hand, or
let the `/new-site` Claude skill ask the questions and run it for you.

I build client demos, marketing sites and small apps, and each one started with the same day of
setup: hosting, CSP headers, analytics consent, Playwright, agent files. This repo is that setup
as data. A project is one framework (Astro or Vite + React), one hosting choice and the modules
you pick. A script puts them together, and the tests build every combination.

- **Five kinds**:
  - `demo`: a client pitch, hidden from search, deployed by hand.
  - `marketing`: a production site.
  - `content`: marketing plus a blog.
  - `app`: a Vite SPA, optionally with a Hono API and D1.
  - `scratch`: a test bed.
- **Hosting**: Cloudflare Workers (Git deploys with branch previews, or by hand), Firebase
  Hosting, or none.
- **A clean start**: a fresh project has no `pnpm audit` advisories and no `pnpm outdated`
  packages beyond the documented holds. The preset test checks this for every kind.
- **Agent files**: `AGENTS.md` and `CLAUDE.md` in the repo, and `CLAUDE.local.md` with your own
  rules (no Claude co-author lines, writing style, where plans live).
- **Later changes**: `add` brings a module into an existing project without overwriting files
  you've edited. `go-live` turns a demo into the production site.

## Quick start

Needs Node 24+, pnpm, and Claude Code for the skill.

```sh
git clone https://github.com/<you>/web-scaffold ~/dev/web-scaffold
cd ~/dev/web-scaffold
pnpm install          # only Prettier, for working on the scaffold
pnpm install-skill    # links skills/new-site into ~/.claude/skills
```

Then in Claude Code, ask for a new site, or run `/new-site`. Without Claude:

```sh
node create.mjs create --kind demo --name "Harbour Choir" --group web-dev \
  --description "A community choir in Frankston." --plans ../plans/harbour-choir --check --git
```

`node create.mjs help` lists every option, and `node create.mjs list` shows the kinds and
modules.

## Kinds

| Kind        | For                                                          | Framework | Default modules                                                  |
| ----------- | ------------------------------------------------------------ | --------- | ---------------------------------------------------------------- |
| `demo`      | A client demo or pitch: hidden from search, deployed by hand | Astro     | quality, design-system, host-cf-manual, demo, images             |
| `marketing` | A production site search should find                         | Astro     | quality, design-system, host-cf-git, images, check-site, e2e, ci |
| `content`   | Marketing plus a blog or docs                                | Astro     | marketing's, plus blog                                           |
| `app`       | Screens people work in, hidden from search                   | Vite      | quality, design-system, host-cf-git, e2e, ci                     |
| `scratch`   | A test bed: dev, build and format only                       | Vite      | none                                                             |

## Modules

| Module           | Works with  | What it adds                                                                                             |
| ---------------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| `quality`        | astro, vite | ESLint, a Prettier check, typecheck, Vitest, the token check, and the `pnpm check` gate                  |
| `design-system`  | astro, vite | A README to fill in, a contrast test over `tokens.css`, and `pnpm assets` for icons and the social image |
| `host-cf-git`    | astro, vite | Cloudflare Workers static assets via Workers Builds: main deploys, each branch gets a preview URL        |
| `host-cf-manual` | astro, vite | Cloudflare Workers static assets, `pnpm deploy` by hand                                                  |
| `host-firebase`  | astro, vite | Firebase Hosting: `firebase.json` with headers and clean URLs, preview channels                          |
| `demo`           | astro       | noindex everywhere, robots.txt disallow, no sitemap, X-Robots-Tag, demo banner, sample badges            |
| `images`         | astro       | `Picture` (astro:assets), a picture registry with credits, a `/credits` page, `Placeholder`              |
| `analytics`      | astro       | Cookieless Cloudflare Web Analytics, plus GA4 and Meta Pixel after consent                               |
| `contact-form`   | astro       | A Web3Forms contact page that works without JavaScript, and a privacy page                               |
| `blog`           | astro       | A Markdown collection, list and post pages, posts in llms.txt, and drafts that only build in dev         |
| `dark-theme`     | astro       | Dark tokens, a header toggle, and a saved choice applied before first paint                              |
| `ui-kit`         | astro, vite | shadcn/ui Button, Input and Label on Radix, plus the token bridge for `shadcn add`                       |
| `check-site`     | astro       | Checks the built HTML: landmarks, CSP hashes, noindex and sitemap agreement, links, starter text         |
| `e2e`            | astro, vite | Playwright: no sideways scroll at six widths, light and dark, 200% text; axe; the consent check          |
| `ci`             | astro, vite | GitHub Actions running `pnpm check` and the e2e tests, with actions pinned to SHAs                       |
| `plans-in-repo`  | astro, vite | `plans/` with a brief, the open items and a plan template                                                |
| `worker-api`     | vite        | A Hono API on the same Worker under `/api`, security headers, Worker tests, generated `Env` types        |
| `d1`             | vite        | D1 with a Drizzle schema, migrations applied before deploy, tests against local D1                       |

Every module that wires up an outside service links its official docs. The links go into the
project README and the create output (`node create.mjs docs <module>`).

## Later

```sh
node create.mjs add analytics --dir ~/dev/web-dev/harbour-choir
node create.mjs go-live --dir ~/dev/web-dev/harbour-choir --url https://choir.org.au \
  --email hello@choir.org.au --hosting cf-git --with analytics
```

`add` replaces files the project never touched and lists the ones it changed (`--force`
replaces those too). `go-live` removes the demo module and turns indexing and the sitemap back
on. With `--hosting`, it also swaps the hosting module.

## Make it yours

- **`scaffold.config.json`** holds the personal defaults:
  - where projects go (`devRoot`, `groups`);
  - the default locale;
  - git settings;
  - which notes go into every `CLAUDE.local.md`. The notes are files in
    `base/templates/local/`, such as `git.md` (no Claude co-author lines) and `writing.md`. Add
    your own file and list it.
- **`presets.json`** sets each kind's framework and default modules.
- **`base/files/design-system/tokens.css`** holds the neutral starting tokens.
- **New modules**: see `AGENTS.md`. A module is a `module.json` plus files, and the schema in
  `schemas/module.schema.json` lists every field.

## Versions

Every version a generated project uses is in `versions.json`:

- package ranges;
- Node;
- pnpm;
- GitHub Action SHAs;
- the Cloudflare compatibility date;
- overrides.

Ranges are caret ranges, so a new project installs the newest minor and patch releases. A major
only changes when someone edits it.

```sh
pnpm versions:check   # new majors, holds that can be lifted, deprecations, Node LTS, actions
pnpm versions:bump    # raise floors within each major (releases at least a day old), action SHAs
```

Some majors are held back on purpose. The `holds` list says why and which packages block them.
Today that's TypeScript 7, which typescript-eslint and @astrojs/check don't support yet.
`versions:check` says when a hold's blockers have caught up.

Generated projects also refuse releases less than a day old (`minimumReleaseAge`), as a guard
against hijacked packages.

## Testing

```sh
pnpm test             # seconds: schemas, ranges, a dry generation of every case
pnpm test:presets     # minutes: install, pnpm check, wrangler dry-run, audit, outdated per case
pnpm test:e2e         # the above plus Playwright in every case that has it
node tests/presets.test.mjs --only demo,app-api
```

## How it fits together

```
create.mjs + lib/   the generator (no dependencies)
base/               files and templates every project gets
frameworks/<name>/  framework.json and files/
modules/<name>/     module.json and files/{common,astro,vite}/
presets.json        module order and the kinds
versions.json       every version
skills/new-site/    the Claude skill
tests/              unit (fast) and presets (slow)
```

Modules don't patch code. They add files where the base already looks for them:

- Astro layout slots: `src/parts/<slot>/*.astro`, where the slot is head, body-start,
  header-end, footer or body-end.
- CSP origins: `config/csp/<service>.json`. A file's origins are added only when its env
  variable is set.
- Env types: `src/env/<module>.d.ts`.

These files are generated from `module.json` fields:

- `package.json`
- `pnpm-workspace.yaml`
- `wrangler.jsonc`
- `firebase.json`
- the CI workflow
- the agent files

`AGENTS.md` covers working on the scaffold, `CHANGELOG.md` the releases, and
`docs/decisions.md` why the scaffold is built the way it is.

## License

MIT
