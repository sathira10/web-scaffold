// Fails when colors are written anywhere except design-system/tokens.css.
// Rule: semantic tokens only. Catches hex and rgb()/hsl()/oklch() literals, including inside
// Tailwind arbitrary values such as bg-[#fff].
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const ROOTS = ["src", "public", "design-system", "index.html"];
const SKIP = new Set(["design-system/tokens.css"]);
// The design system's own docs may quote raw values when they explain a token.
const isDesignDoc = (path) => path.startsWith("design-system/") && path.endsWith(".md");
const EXTENSIONS = new Set([".ts", ".tsx", ".astro", ".css", ".html", ".mdx", ".md"]);
const PATTERNS = [
  [/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b(?![\w-])/, "hex color"],
  [/\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\(/, "color function"],
];

const failures = [];

function walk(path) {
  if (statSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) walk(join(path, entry));
  } else if (EXTENSIONS.has(extname(path)) && !SKIP.has(path) && !isDesignDoc(path)) {
    scan(path);
  }
}

function scan(path) {
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, index) => {
      // Fragment links like href="#main" are not colors.
      const text = line.replace(/(?:href|id|for)="#?[\w-]+"/g, "");
      for (const [pattern, label] of PATTERNS) {
        if (pattern.test(text)) failures.push(`${path}:${index + 1}: ${label}: ${line.trim()}`);
      }
    });
}

for (const root of ROOTS) {
  try {
    walk(root);
  } catch (error) {
    if (error.code !== "ENOENT") throw error; // root missing: nothing to check
  }
}

if (failures.length) {
  console.error("Raw colors found outside design-system/tokens.css:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("check-tokens: ok");
