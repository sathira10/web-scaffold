// Project values (name, slug, url...) and the __TOKEN__ substitution that writes them into files.
import { existsSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { config, versions } from "./catalog.mjs";
import { fail, isText, read } from "./util.mjs";

export const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** A site URL: https, a host, no path. The trailing slash is dropped. */
export function checkUrl(value) {
  const url = value.replace(/\/$/, "");
  if (!/^https:\/\/[^/\s]+$/.test(url)) fail(`--url must look like https://example.org`);
  return url;
}

export function checkEmail(value) {
  if (!/^[^\s@"<>]+@[^\s@"<>]+\.[^\s@"<>]+$/.test(value))
    fail(`--email must look like hello@example.org`);
  return value;
}

/** The values a new project starts with. Missing facts get obvious stand-ins. */
export function defaults(options, kind) {
  const name = options.name;
  const slug = options.slug ?? slugify(name);
  if (!/^[a-z0-9-]+$/.test(slug)) fail(`slug "${slug}" must be lower case letters, digits and -`);
  return {
    name,
    slug,
    url: checkUrl(options.url ?? "https://example.com"),
    email: checkEmail(options.email ?? "hello@example.com"),
    description: options.description ?? `${name}. Replace this with one plain sentence.`,
    tagline: options.tagline ?? name,
    locale: options.locale ?? config.locale ?? "en",
    kind,
  };
}

/** Escapes a value for the file type it lands in. */
export function escapeFor(path, value) {
  const ext = extname(path);
  if ([".ts", ".tsx", ".js", ".mjs", ".json", ".jsonc"].includes(ext))
    return JSON.stringify(value).slice(1, -1);
  if ([".html", ".astro", ".svg"].includes(ext))
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  return value;
}

export function tokens(values, fw) {
  return {
    __NAME__: values.name,
    __SLUG__: values.slug,
    __URL__: values.url,
    __EMAIL__: values.email,
    __DESCRIPTION__: values.description,
    __TAGLINE__: values.tagline,
    __LOCALE__: values.locale,
    __KIND__: values.kind,
    __NOT_FOUND__: fw.notFound,
    __ASSETS_DIR__: fw.assetsDir,
    __COMPAT_DATE__: versions.cloudflareCompatibilityDate,
    __YEAR__: String(new Date().getFullYear()),
  };
}

/** Replaces known tokens in text. Unknown __TOKENS__ are left alone. */
export const replaceTokens = (file, text, map) =>
  text.replace(/__[A-Z_]+__/g, (token) => (token in map ? escapeFor(file, map[token]) : token));

export function substitute(dir, files, values, fw) {
  const map = tokens(values, fw);
  for (const file of files) {
    const path = join(dir, file);
    if (!existsSync(path) || !isText(file)) continue;
    const text = read(path);
    const next = replaceTokens(file, text, map);
    if (next !== text) writeFileSync(path, next);
  }
}
