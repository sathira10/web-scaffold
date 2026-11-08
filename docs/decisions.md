# Decisions

Why the scaffold is built the way it is.

## Conventions

- Tailwind v4 configured in CSS; no `tailwind.config`.
- Semantic tokens only, no raw colors in components.
- Self-hosted fonts, Cloudflare hosting, `_headers` with a CSP, static-first, Web3Forms.
- Prettier `printWidth: 100`.

## Choices

| Question                     | Decision                                                       |
| ---------------------------- | -------------------------------------------------------------- |
| Package manager              | pnpm                                                           |
| Language                     | TypeScript strict                                              |
| Lint / format / tests / CI   | ESLint + Prettier + Vitest + GitHub Actions in both frameworks |
| Host                         | Workers static assets, staging + production                    |
| Framework for content sites  | Astro + React islands (React only where interactive)           |
| Framework for app-like sites | Vite + React (a plain SPA is poor for SEO, so not for content) |

## Things that look wrong but aren't

- Astro doesn't need React for content sites. React is there as islands so interactive pieces
  share components with the Vite framework.
- A design system is tokens plus the reasoning document, not a CSS file alone.
- `--text-*` is reserved by Tailwind v4 for font sizes, so semantic text colors are `fg-*`.
- Astro emits inline bootstrap scripts for islands, which a strict header CSP would block. The
  Astro framework uses `security.csp` (hashes in a meta tag) and keeps only `frame-ancestors` in
  `_headers`.
- pnpm refuses dependency build scripts until allowed, hence `allowBuilds` in
  `pnpm-workspace.yaml`.
- Code blocks use Prism classes (not Shiki) so the CSP needs no inline styles.

## Known limits

- Held-back majors and their reasons are in `versions.json` under `holds`.
- The CSP lists analytics and form origins only when their `PUBLIC_*` variables are set at build
  time. Changing them means rebuilding.
- The consent flow, contact submission (needs a Web3Forms key) and the production CSP need a
  real browser to check. Run through staging first.
