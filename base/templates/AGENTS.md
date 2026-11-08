# Agent guide

Conventions for any coding agent or person working in this repo.

## What this repo is

{{ABOUT}}

## Boundaries

{{BOUNDARIES}}

## Stack

- pnpm only. Never run `npm` or `yarn`, and never commit another lockfile.
- {{STACK}}
- TypeScript strict. Tailwind CSS v4 is configured in CSS; there is no `tailwind.config`.
- No new dependency without asking. Prefer what is already installed.

## Design system

- Tokens live in `design-system/tokens.css`. Components use semantic tokens only: no raw hex,
  `rgb()` or arbitrary color values (`bg-[#fff]`) outside that file. `pnpm check:tokens`
  enforces it.
- Text colors are `fg-*`, never `text-*`: Tailwind v4 reserves `--text-*` for font sizes.
- Body text is at least 16px, tap targets at least 44px, and every control has a visible focus
  state.
{{DESIGN}}

## Content and facts

- Every fact (name, email, price, date) comes from `src/data/site.ts`. Never type one into a page.
- Never invent a number, date, quote or claim. If a fact is missing, leave the claim out and
  add it to the open items ({{OPEN_ITEMS}}).

## Commits

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`,
  with an optional scope such as `feat(contact): ...`.
- Short imperative subject, lower case, no trailing period. Add a body only when the reason
  isn't obvious from the subject.
- One logical change per commit. Never commit generated output (`dist/`, `.astro/`).
- Work on a branch and merge into `main`.

## Commands

See `scripts` in `package.json`. `pnpm check` is the gate and must pass before every commit.

## Pitfalls

Add a pitfall only after the same mistake has happened twice. If it can be a check, make it a
check instead.

{{PITFALLS}}
