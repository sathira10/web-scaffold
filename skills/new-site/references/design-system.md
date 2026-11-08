# Fill in the design system

Edit only `design-system/tokens.css` (values) and `design-system/README.md` (the reasons). Keep
the token names: components and the contrast test use them. Add a token only with a reason in
the README.

## Claude Design System artifact

Find it with the Artifact tool (`action: "list"` with the type name, or the link the user
gives) and read it. Map its colors, type, radius and spacing onto the tokens, and write its
content rules into the README.

## Another repo

Copy that repo's `design-system/` values and rules in. If the source will keep changing, say so
and suggest a small sync script that copies `tokens.css` across and runs the contrast test.

## A brief

Draft the tokens from what the user gave: brand colors, fonts, a reference site. Self-host fonts
with `@fontsource` packages, imported in `src/styles/global.css`. Ask before adding the
dependency, and add its range to the scaffold's `versions.json` only if it should become a
default.

## Skip

Leave the neutral tokens and add "design system" to the open items.

## Then

Run `pnpm test`: the contrast test must pass. With the design-system module, run `pnpm assets`
for favicons, app icons and the social image.
