---
name: new-site
description: Starts a new website or web app from web-scaffold, adds a module to a project made with it, or takes a client demo live. Use when the user wants a new site, landing page, client demo, marketing site, blog or docs site, web app, or a scratch project to try something (web audio, a library), or says "scaffold", "new project", "add analytics/contact form/D1/worker to this site", or "take the demo live".
metadata:
  version: "0.1.0"
---

# new-site

All project code comes from web-scaffold: `create.mjs` copies a framework and tested modules and
wires them together. Never write hosting, analytics, form, Worker or database integration code
from memory. If no module covers what's needed, say so and offer to add a module to web-scaffold
first (its `AGENTS.md` has the checklist).

## Find the scaffold

This skill is a symlink into the web-scaffold repo. Resolve the repo root once and use it for
every command:

```sh
SCAFFOLD="$(cd "$(dirname "$(realpath <this skill's base directory>/SKILL.md)")/../.." && pwd)"
node "$SCAFFOLD/create.mjs" list --json
```

`list --json` gives the version, kinds, modules (with requires, conflicts, docs and manual
steps), hosting options and the user's defaults from `scaffold.config.json` (`devRoot`, `groups`,
`locale`). Use it instead of guessing what exists.

## Pick the mode

- New project: "Create" below.
- The current directory has `.scaffold.json` and the user wants something added: read
  `references/add.md`.
- A demo (`.scaffold.json` lists `demo`) is going to production: read `references/go-live.md`.

## Create

### 1. Ask

Ask everything in one `AskUserQuestion` call (two at most). Skip what the user already said. Put
the recommended option first.

1. Kind: `demo` (client pitch, hidden from search, no analytics, deployed by hand), `marketing`
   (production site search should find), `content` (marketing plus a blog or docs), `app`
   (screens people work in), `scratch` (a test bed with almost no setup).
2. Hosting. The kind sets the default (demo: `cf-manual`; marketing, content, app: `cf-git`;
   scratch: none). Options: `cf-git` (Workers Builds with branch previews), `cf-manual`,
   `firebase`, `none`.
3. Add-ons, multi-select, from the kind's `optional` list. "Other backend later" means no module
   now; note it in the brief. A demo can't have analytics.
4. Design system source: a Claude Design System artifact, another repo's `design-system/`, a
   brief (colors, fonts, logo, a reference site), or skip.
5. Plans: in the repo (`plans/`) or outside it (a sibling folder such as `../plans/<slug>/`, or
   a Claude Doc link). Client repos usually keep plans outside.
6. GitHub: local git only (default), or also create a GitHub repo and push.

Also get the name, one plain sentence of description, and for a site the production URL and
contact email (a demo can leave both for later). For the location, suggest
`<devRoot>/<group>/<slug>` with a group from config `groups`; pass `--group` or `--dir`. Look in
the group folder for sibling repos worth noting and pass them as `--nearby`.

### 2. Run create.mjs

```sh
node "$SCAFFOLD/create.mjs" create --kind <kind> --name "<Name>" (--group <group> | --dir <path>) \
  [--hosting cf-git|cf-manual|firebase|none] [--with a,b] [--without a,b] \
  [--url https://...] [--email ...] [--description "..."] [--tagline "..."] [--locale en-US] \
  [--plans in-repo|<path or URL>] [--nearby "path=what it is;path=what it is"]
```

Don't pass `--git` yet: commit after the design system and specs are in. The script installs
with pnpm and formats everything. Read its output, including the "Still to do" list.

### 3. Design system

Skip for scratch. Otherwise read `references/design-system.md` and follow the section for the
chosen source. Then run `pnpm test` (the contrast test must pass) and `pnpm assets`.

### 4. Specs and facts

- Put every fact the user gave into `src/data/site.ts`.
- Plans in the repo: fill `plans/00-brief.md` and list every missing fact or asset in
  `plans/OPEN-ITEMS.md`. Plans outside: write the brief and open items there.
- Never invent a fact, price, date, quote or testimonial. A missing fact becomes an open item and
  the page leaves the claim out.

### 5. Check and commit

```sh
pnpm check                        # pnpm build for scratch
pnpm wrangler deploy --dry-run    # Cloudflare hosting only
git init -b main && git add -A && git commit -m "chore: scaffold <kind> project from web-scaffold"
```

The commit has no `Co-Authored-By` line and no "Generated with" line. Push only if the user
chose GitHub: `gh repo create <slug> --private --source . --push`.

If `pnpm check` fails, fix the cause; never weaken a check. If the failure comes from
web-scaffold itself, tell the user and offer to fix the scaffold.

### 6. Hand over

Reply with where the project is and how to run it (`pnpm dev`), the manual steps left (the
"Still to do" list, each with its doc link), and what was guessed or left open.
