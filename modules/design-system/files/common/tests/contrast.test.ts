import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Reads design-system/tokens.css and checks the color pairs the site uses. Add a pair here
// when a token is added. Themes are the `:root` block and, if present, the dark block.
const css = readFileSync(new URL("../design-system/tokens.css", import.meta.url), "utf8");

function block(selector: string): Map<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) return new Map();
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  return new Map(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map((m) => [m[1]!, m[2]!]),
  );
}

const light = block(":root {");
const dark = new Map([...light, ...block(':root[data-theme="dark"]')]);
const themes = { light, ...(block(':root[data-theme="dark"]').size ? { dark } : {}) };

function luminance(hex: string): number {
  const full = hex.length === 4 ? hex.replace(/\w/g, "$&$&") : hex;
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

// [foreground, grounds, minimum]
const pairs: [string, string[], number][] = [
  ["fg", ["bg", "surface", "surface-raised"], 4.5],
  ["fg-soft", ["bg", "surface", "surface-raised"], 4.5],
  ["fg-muted", ["bg", "surface", "surface-raised"], 4.5],
  ["accent-fg", ["accent", "accent-hover"], 4.5],
  ["fg", ["accent-soft"], 4.5],
  // Error messages are text: 4.5:1 wherever they appear.
  ["danger", ["bg", "surface", "surface-raised"], 4.5],
  // Links and focus rings are marks: 3:1 against the page.
  ["accent", ["bg", "surface"], 3],
  // Field borders must be visible: 3:1.
  ["line-strong", ["bg", "surface-raised"], 3],
];

describe("token contrast", () => {
  for (const [theme, tokens] of Object.entries(themes)) {
    for (const [fg, grounds, min] of pairs) {
      for (const ground of grounds) {
        it(`${theme}: ${fg} on ${ground} reaches ${min}:1`, () => {
          const [a, b] = [tokens.get(fg), tokens.get(ground)];
          expect(a, `--${fg} is missing or not a hex value`).toBeDefined();
          expect(b, `--${ground} is missing or not a hex value`).toBeDefined();
          expect(ratio(a!, b!)).toBeGreaterThanOrEqual(min);
        });
      }
    }
  }
});
