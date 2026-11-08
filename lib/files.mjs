// Copying module files into a project, small edits to src/data/site.ts, and the file hashes
// in .scaffold.json that let `add` tell untouched files from edited ones.
import { appendFileSync, cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { hash, read, readJson, unique, walk, writeJson } from "./util.mjs";

/** The files a module adds for this framework, as paths relative to the project. */
export const moduleFiles = (mod, fw) =>
  unique([...walk(join(mod.dir, "files", "common")), ...walk(join(mod.dir, "files", fw.name))]);

/**
 * Copies a tree. Without force, an existing file is kept unless pristine(file) says the project
 * never changed it; kept files that differ go into conflicts.
 */
export function copyTree(from, to, { force = true, conflicts = [], pristine = () => false } = {}) {
  const written = [];
  for (const file of walk(from)) {
    const target = join(to, file);
    if (existsSync(target) && !force && !pristine(file)) {
      if (read(join(from, file)) !== read(target)) conflicts.push(file);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(from, file), target);
    written.push(file);
  }
  return written;
}

export function applyModuleFiles(dir, mod, fw, options = {}) {
  const written = [
    ...copyTree(join(mod.dir, "files", "common"), dir, options),
    ...copyTree(join(mod.dir, "files", fw.name), dir, options),
  ];
  for (const [target, source] of Object.entries(mod.append ?? {})) {
    const path = join(dir, target);
    const addition = read(join(mod.dir, source));
    if (existsSync(path) && read(path).includes(addition.trim().split("\n")[0])) continue;
    appendFileSync(path, "\n" + addition);
    written.push(target);
  }
  return written;
}

const SITE = "src/data/site.ts";

export function setSiteFlag(dir, key, value) {
  const path = join(dir, SITE);
  if (!existsSync(path)) return;
  const text = read(path);
  const next = text.replace(new RegExp(`(\\n\\s*${key}: )(true|false),`), `$1${value},`);
  if (next === text && !text.includes(`${key}: ${value},`))
    console.warn(`warning: could not set ${key} in ${SITE}; set it by hand`);
  writeFileSync(path, next);
}

export function setSiteString(dir, key, value) {
  const path = join(dir, SITE);
  if (!existsSync(path)) return;
  const text = read(path);
  writeFileSync(
    path,
    text.replace(new RegExp(`(\\n\\s*${key}: )"[^"]*",`), `$1${JSON.stringify(value)},`),
  );
}

/** Adds nav items before the `// nav:end` marker in site.ts. */
export function addNav(dir, items) {
  const path = join(dir, SITE);
  if (!existsSync(path) || !items?.length) return;
  let text = read(path);
  for (const item of items) {
    if (text.includes(`href: "${item.href}"`)) continue;
    text = text.replace(
      /(\n(\s*)\/\/ nav:end)/,
      `\n$2{ href: "${item.href}", label: "${item.label}" },$1`,
    );
  }
  writeFileSync(path, text);
}

export function applySiteChanges(dir, mod) {
  for (const [key, value] of Object.entries(mod.siteFlags ?? {})) setSiteFlag(dir, key, value);
  addNav(dir, mod.nav);
}

const HASH_SKIP = /^(dist|\.astro|\.wrangler|coverage|test-results|playwright-report|\.audit)\//;

export function recordHashes(dir) {
  const path = join(dir, ".scaffold.json");
  const files = Object.fromEntries(
    walk(dir)
      .filter((file) => !HASH_SKIP.test(file) && !file.endsWith("pnpm-lock.yaml"))
      .filter(
        (file) =>
          file !== ".scaffold.json" && !file.startsWith(".env") && !file.endsWith(".local.md"),
      )
      .sort()
      .map((file) => [file, hash(join(dir, file))]),
  );
  writeJson(path, { ...readJson(path), files });
}

export const pristineCheck = (dir, project) => (file) => {
  const path = join(dir, file);
  return Boolean(project.files?.[file]) && existsSync(path) && project.files[file] === hash(path);
};
