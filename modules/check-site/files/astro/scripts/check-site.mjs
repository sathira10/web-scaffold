// Checks the built site in dist/: every page, its metadata, CSP and links. Runs after
// `pnpm build` as part of `pnpm check`. The pages come from dist/, so a new page is covered
// without editing this file.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const source = readFileSync("src/data/site.ts", "utf8");
const siteUrl = source.match(/\burl:\s*"([^"]+)"/)?.[1];
const demo = /\bdemo:\s*true\b/.test(source);
assert(siteUrl, "could not read url from src/data/site.ts");
const unlisted = JSON.parse(
  readFileSync("src/lib/routes.ts", "utf8")
    .match(/unlisted\s*=\s*(\[[^\]]*\])/)?.[1]
    ?.replace(/'/g, '"')
    .replace(/,\s*\]/, "]") ?? "[]",
);

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return path.endsWith(".html") ? [path] : [];
  });
}

const routeOf = (file) => {
  const path = "/" + relative("dist", file).replace(/\.html$/, "");
  return path === "/index" ? "/" : path.replace(/\/index$/, "");
};
const decode = (value) =>
  value.replaceAll("&amp;", "&").replaceAll("&#39;", "'").replaceAll("&quot;", '"');
const attribute = (tag, name) =>
  decode(tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1] ?? "");
const ids = (html) => [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);

const pages = new Map(htmlFiles("dist").map((file) => [routeOf(file), readFileSync(file, "utf8")]));
const sitemap = readdirSync("dist")
  .filter((file) => /^sitemap.*\.xml$/.test(file))
  .map((file) => readFileSync(join("dist", file), "utf8"))
  .join("\n");
if (demo) assert.equal(sitemap, "", "a demo build must have no sitemap");

// Text a fresh scaffold ships with. The tokens are built here so the scaffold's own substitution
// step can't rewrite them.
const starters = ["example.com", "Replace this with", ...["NAME", "URL"].map((t) => `__${t}__`)];

let references = 0;
for (const [route, html] of pages) {
  const pageIds = ids(html);
  assert.equal(pageIds.length, new Set(pageIds).size, `${route}: duplicate ids`);
  assert.equal((html.match(/<main\b/g) ?? []).length, 1, `${route}: one <main>`);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${route}: one <h1>`);
  assert(pageIds.includes("main"), `${route}: skip link target #main`);
  assert(!/\sstyle=/.test(html), `${route}: inline style= (the CSP drops it)`);
  if (!demo) {
    for (const starter of starters)
      assert(!html.includes(starter), `${route}: starter text "${starter}" left in`);
  }

  const metas = html.match(/<meta\b[^>]*>/g) ?? [];
  const csp = metas.find((tag) => attribute(tag, "http-equiv") === "content-security-policy");
  assert(csp, `${route}: no CSP meta tag`);
  const policy = attribute(csp, "content");
  assert(!policy.includes("unsafe-inline"), `${route}: unsafe-inline in the CSP`);

  for (const [, tag, content] of html.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script>/g)) {
    const src = attribute(tag, "src");
    if (src) assert(src.startsWith("/"), `${route}: third-party script ${src} in the page`);
    else if (attribute(tag, "type") === "application/ld+json")
      assert(JSON.parse(content)["@context"], `${route}: invalid JSON-LD`);
    else if (content) {
      const hash = createHash("sha256").update(content).digest("base64");
      assert(policy.includes(`sha256-${hash}`), `${route}: inline script without a CSP hash`);
    }
  }

  const noindex = metas.some(
    (tag) => attribute(tag, "name") === "robots" && attribute(tag, "content").includes("noindex"),
  );
  const hidden = demo || unlisted.includes(route);
  assert.equal(noindex, hidden, `${route}: ${hidden ? "needs" : "must not have"} noindex`);

  const canonical = (html.match(/<link\b[^>]*>/g) ?? []).find(
    (tag) => attribute(tag, "rel") === "canonical",
  );
  assert.equal(
    attribute(canonical ?? "", "href"),
    `${siteUrl}${route === "/" ? "" : route}`,
    `${route}: canonical`,
  );
  if (!demo)
    assert.equal(
      sitemap.includes(`<loc>${siteUrl}${route === "/" ? "/" : route}</loc>`),
      !hidden,
      `${route}: ${hidden ? "must stay out of" : "missing from"} the sitemap`,
    );

  for (const tag of html.match(/<(?:a|link|img|source|script)\b[^>]*>/g) ?? []) {
    const isLink = tag.startsWith("<a ") || tag.startsWith("<link ");
    const refs = [
      attribute(tag, isLink ? "href" : "src"),
      ...attribute(tag, "srcset")
        .split(",")
        .map((entry) => entry.trim().split(/\s/)[0]),
    ].filter(Boolean);
    for (const ref of refs) {
      if (!ref.startsWith("/") && !ref.startsWith("#")) continue;
      const target = new URL(ref, `${siteUrl}${route}`);
      const path = target.pathname.replace(/\/$/, "") || "/";
      if (pages.has(path)) {
        if (target.hash)
          assert(
            ids(pages.get(path)).includes(decodeURIComponent(target.hash.slice(1))),
            `${route}: broken anchor ${ref}`,
          );
      } else {
        assert(existsSync(join("dist", target.pathname)), `${route}: missing file ${ref}`);
        references++;
      }
    }
  }
}

console.log(
  `check-site: ${pages.size} pages, metadata, CSP, links and ${references} file references ok` +
    (demo ? " (demo build)" : ""),
);
