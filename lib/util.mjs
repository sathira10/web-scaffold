// Small helpers with no knowledge of the scaffold.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { extname, join, relative } from "node:path";

export const read = (path) => readFileSync(path, "utf8");
export const readJson = (path) => JSON.parse(read(path));
export const writeJson = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
export const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
export const unique = (list) => [...new Set(list)];
export const sortKeys = (object) =>
  Object.fromEntries(Object.entries(object ?? {}).sort(([a], [b]) => a.localeCompare(b)));
export const list = (value) =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
export const expandHome = (path) => path.replace(/^~(?=$|\/)/, homedir());
export const bullets = (lines, empty) =>
  lines.length ? lines.map((line) => `- ${line}`).join("\n") : empty;

export class ScaffoldError extends Error {}

/** Stops the command with a message for the user. Thrown, so tests can catch it. */
export function fail(message) {
  throw new ScaffoldError(message);
}

/** Deep merge. Arrays are unioned; a null value deletes the key. */
export function merge(target, source) {
  for (const [key, value] of Object.entries(source ?? {})) {
    if (value === null) delete target[key];
    else if (isObject(value) && isObject(target[key])) merge(target[key], value);
    else if (Array.isArray(value) && Array.isArray(target[key]))
      target[key] = unique([...target[key], ...value]);
    else target[key] = structuredClone(value);
  }
  return target;
}

/** JSON with comments and trailing commas, as wrangler.jsonc allows. */
export function parseJsonc(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j;
    } else if (char === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (char === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i + 2) + 1;
    } else out += char;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

/** Every file under dir, relative to it. Skips node_modules and .git. */
export function walk(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (entry === "node_modules" || entry === ".git") return [];
    return statSync(path).isDirectory() ? walk(path, base) : [relative(base, path)];
  });
}

const TEXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".md",
  ".astro",
  ".css",
  ".html",
  ".txt",
  ".yml",
  ".yaml",
  ".svg",
  ".sql",
  ".toml",
  "",
]);
export const isText = (path) => TEXT.has(extname(path)) || /(^|\/)\.[^/.]+$/.test(path);

export const hash = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 16);

export function run(command, args, cwd) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  execFileSync(command, args, { cwd, stdio: "inherit" });
}
