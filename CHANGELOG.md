# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow
[semver](https://semver.org/), applied to what a generated project gets:

- Major: a change that breaks `add` or `go-live` on projects made by the previous major (module
  layout, layout slots, `.scaffold.json`).
- Minor: a new module or kind, or a dependency moving to a new major.
- Patch: fixes, and `pnpm versions:bump` floor updates.

## [0.1.0] - Unreleased

Planned as 1.0.0 once verified.

- `create.mjs` with `create`, `add`, `go-live`, `list`, `docs` and `install-skill`. No
  dependencies, Node built-ins only.
- Two frameworks: Astro with React islands, and Vite with React.
- Five kinds in `presets.json`: demo, marketing, content, app and scratch.
- Modules: analytics, blog, check-site, ci, contact-form, d1, dark-theme, demo, design-system,
  e2e, host-cf-git, host-cf-manual, host-firebase, images, plans-in-repo, quality, ui-kit and
  worker-api.
- Astro sites serve `/llms.txt`: the site summary, the nav pages and, with the blog module, every
  post. A module adds a section with a file in `src/parts/llms/`. A demo build lists nothing.
- The `/new-site` Claude skill.
- `versions.json`, the single place for every version a project uses, with
  `pnpm versions:check` and `pnpm versions:bump`. Generated projects set
  `minimumReleaseAge: 1440`.
- `scaffold.config.json` for personal defaults, and JSON Schemas for every config file.
- `.scaffold.json` in each project records `scaffoldVersion`. `add` and `go-live` warn when a
  project came from an older major.
- Tests: `pnpm test` (seconds), `pnpm test:presets` (installs, checks, audits every case) and
  `pnpm test:e2e`.
