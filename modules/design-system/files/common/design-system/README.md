<!--
  The design system for __NAME__. This is web-scaffold's neutral default: grayscale, system
  fonts, one red for errors, and a fixed set of layout classes. It is complete and can ship as
  it is. When a real design system arrives (a Claude Design System, another repo's
  design-system/, or a brief), rewrite this file and the values in tokens.css. Keep every token
  name and layout class: pages, modules and tests/contrast.test.ts depend on them.
-->

# Design system

Plain and structural. The page should read like a well-set document: clear hierarchy, generous
space, nothing decorative. It is built so a brand can be applied later by changing token values,
without moving any layout.

## Content

- Plain sentences, addressed to the reader as "you". The business is "we" or its name.
- Sentence case for headings, buttons and labels. No emoji.
- Buttons and links say what happens ("Send message", "See the timetable"), never "Click here"
  or "Learn more".
- Every fact comes from `src/data/site.ts`. If a fact is missing, the claim is left out.

## Color

There is no hue except `danger`. Hierarchy comes from tone, weight and space.

- `bg` is the page ground, `surface` a band or panel one step off it, `surface-raised` a card or
  field sitting on a surface.
- `fg` is body copy and headings, `fg-soft` secondary copy, `fg-muted` captions and metadata.
- `line` separates areas; `line-strong` outlines fields and controls (3:1).
- `accent` is near-black and marks interactive elements only: primary buttons, the focus ring,
  selected states. `accent-fg` is the text on it. `accent-soft` is a quiet hover or selection
  ground.
- `danger` is the only color. Use it for errors and destructive actions, always with words
  (and an icon where it helps), never as the only signal.
- Contrast floor: text 4.5:1 on its ground, large text and marks 3:1. `tests/contrast.test.ts`
  checks every pair, in both themes when the dark theme is installed.

## Type

- One family: the system sans (`font-sans`) for everything, the system mono (`font-mono`) for
  code and data. No web fonts to load.
- `text-display`: the home page headline, once per site. `text-h1`: one per page.
  `text-h2`: section headings. `text-h3`: card and sub-section titles.
- `text-lead`: the paragraph under a page heading. `text-body`: everything else.
  `text-small`: captions, hints, footer.
- Hierarchy is a hard jump, never a nudge. Headings are bold; body is regular. Body text is never
  below 16px.

## Layout and spacing

Build every page from the classes in `design-system/layout.css`:

| Class | Use |
| --- | --- |
| `wrap` | The default column for page content, header and footer (`max-w-content`, 64rem) |
| `wrap-narrow` | Forms, articles, single-column pages (46rem) |
| `wrap-wide` | Galleries and dashboards that need more width (80rem) |
| `section` | Each band of a page; spacing between bands (64px, 96px on large screens) |
| `stack`, `stack-sm`, `stack-lg` | Vertical flow inside a section or card |
| `cluster` | Rows of buttons, tags or links that wrap on a phone |
| `grid-auto` | Cards and features: as many columns as fit, one on a phone |
| `prose` | Long-form text from Markdown or a CMS |

- Reading measure is 65ch (`max-w-prose`). Headings wrap with `text-wrap: balance`.
- Change a band's ground with `bg-surface`, not with borders or shadows.
- At 320px wide nothing scrolls sideways.

## Shape, interaction and motion

- Radius is small (`rounded-md`, 4px) on buttons, fields and cards. No pills, no circles except
  avatars.
- Depth comes from the ground steps and `line` hairlines. No shadows.
- Primary button: `bg-accent text-accent-fg`. Secondary: `border border-line-strong`.
  Links in running text are underlined.
- Tap targets at least 44px; fields at least 48px tall. Every control has a visible
  `:focus-visible` ring.
- Only color and opacity animate, over `--duration-fast` or `--duration` with `ease-standard`.
  Reduced motion removes all of it.

## Imagery and icons

- Pictures only when they carry information. Until real ones arrive, use `Placeholder` (images
  module) rather than stock photos. Credits go in `src/data/pictures.ts`.
- Icons are optional, outline style, 16 to 24px, in `currentColor`. An icon adds to a label; it
  never replaces one.

## Avoid

- A new hue, a gradient, or a tint of the accent.
- Shadows, glows, or more than one radius per element type.
- A heading size between the steps of the scale, or a fourth heading level on a page.
- Color as the only signal of state or error.
- Arbitrary values (`mt-[13px]`, `w-[37rem]`). Add a token with a reason instead.
- Carousels, autoplaying media, decorative imagery and web fonts.
