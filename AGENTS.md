# Working on web-scaffold

For people and coding agents changing the scaffold itself. Generated projects get their own
`AGENTS.md` from `base/templates/`.

## Map

```
create.mjs            entry point: reads the command line, calls lib/commands.mjs
lib/
  catalog.mjs         loads presets.json, versions.json, scaffold.config.json, frameworks, modules
  commands.mjs        create, add, go-live, list, docs, install-skill
  builders.mjs        generated files: package.json, pnpm-workspace.yaml, wrangler.jsonc,
                      firebase.json, ci.yml, AGENTS.md, CLAUDE.local.md, README, .env.example
  files.mjs           copying module files, site.ts edits, file hashes for safe `add`
  substitute.mjs      project values and __TOKEN__ replacement
  util.mjs            helpers with no scaffold knowledge
base/                 files and templates every project gets
frameworks/<name>/    framework.json + files/
modules/<name>/       module.json + files/{common,astro,vite}/ (+ append/)
presets.json          moduleOrder and the kinds
versions.json         every version a project uses
scaffold.config.json  personal defaults (dev root, groups, locale, local notes, git)
schemas/              JSON Schemas for the config files above
scripts/versions.mjs  pnpm versions:check / versions:bump
skills/new-site/      the Claude skill (SKILL.md + references/)
docs/                 decisions.md (why), roadmap.md (later)
tests/                unit.test.mjs (fast), presets.test.mjs (slow), cases.mjs (shared)
```

## Rules

- pnpm only, everywhere: in the scaffold, in generated projects, in docs and in scripts.
- Versions live only in `versions.json`. `module.json` and `framework.json` list package names.
  Run `pnpm versions:bump` for floors. A new major is a manual edit to the range, followed by
  `pnpm test:presets` and a CHANGELOG entry. If a major can't be taken, add a `holds` entry with
  the reason and the blocking packages.
- A pnpm override or an audit waiver needs a `reason` that says when to drop it. Waivers expire.
- `create.mjs` and `lib/` have no dependencies. Node built-ins only.
- Modules never patch code. They add files where the base already looks (layout slots,
  `config/csp/`, `src/env/`), or set fields that `lib/builders.mjs` turns into generated files.
- Never write integration code (hosting, analytics, forms, Worker, D1) into the skill. It goes in
  a module, where the tests run it.
- Commits: conventional (`feat:`, `fix:`, `chore:`, `docs:`, `test:`), short lower case subject,
  one change each. No `Co-Authored-By` or "Generated with" lines.

## Before committing

- `pnpm test` always (seconds).
- `pnpm test:presets` when a template, module or version changes (minutes). It runs
  `pnpm check`, the wrangler dry-run, `pnpm audit` and `pnpm outdated` in every case.
- `pnpm test:e2e` before a release, or when layout or browser behavior changes.
- `pnpm lint` (Prettier).

## Adding a module

1. `modules/<name>/module.json` with `"$schema": "../../schemas/module.schema.json"`. The schema
   lists every field. `description`, `frameworks` and (for anything that touches an outside
   service) `docs` are required.
2. Files in `files/common/`, `files/astro/` or `files/vite/`.
3. Add every package it uses to `versions.json` `packages`.
4. Add the name to `presets.json` `moduleOrder`. A later module's file replaces an earlier one's.
5. Add it to a kind's `optional` list if the skill should offer it.
6. Add a case to `tests/cases.mjs`, then `pnpm test` and `node tests/presets.test.mjs --only <case>`.
7. CHANGELOG entry (minor version).

## Releasing

1. Update `version` in `package.json` and `metadata.version` in `skills/new-site/SKILL.md`
   (`pnpm test` fails if they differ).
2. Move the CHANGELOG "Unreleased" notes under the new version.
3. Run the full checks above, commit `chore: release vX.Y.Z`, and tag `vX.Y.Z`.

## Pitfalls

- zsh expands `[id].astro` in shell commands. Quote paths with brackets.
- `create.mjs` replaces every `__TOKEN__` it knows in text files. A file that must keep a literal
  token builds it at runtime (see `modules/check-site/files/astro/scripts/check-site.mjs`).
- Worker tests run in workerd and can't read files; unit tests run in Node. The worker-api and d1
  vitest configs keep two projects for that reason.
- A package published less than a day ago fails to install in generated projects
  (`minimumReleaseAge`). `versions:bump` only picks releases older than a day.
- `astro check` crashes on the `@emnapi/runtime` 2.0 beta. The override in `versions.json` stays
  until a stable 2.x ships.
