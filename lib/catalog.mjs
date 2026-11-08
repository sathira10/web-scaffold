// What the scaffold offers: kinds, frameworks, modules, versions and personal config.
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fail, readJson, unique } from "./util.mjs";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const pkg = readJson(join(ROOT, "package.json"));
export const presets = readJson(join(ROOT, "presets.json"));
export const versions = readJson(join(ROOT, "versions.json"));
export const config = readJson(join(ROOT, "scaffold.config.json"));
export const kinds = presets.kinds;

export const HOSTING = {
  "cf-git": "host-cf-git",
  "cf-manual": "host-cf-manual",
  firebase: "host-firebase",
};

export const frameworkNames = () =>
  readdirSync(join(ROOT, "frameworks")).filter((name) =>
    existsSync(join(ROOT, "frameworks", name, "framework.json")),
  );

export function framework(name) {
  const dir = join(ROOT, "frameworks", name);
  if (!existsSync(join(dir, "framework.json")))
    fail(`unknown framework "${name}" (${frameworkNames().join(" or ")})`);
  return { name, dir, ...readJson(join(dir, "framework.json")) };
}

export function moduleInfo(name) {
  const dir = join(ROOT, "modules", name);
  if (!existsSync(join(dir, "module.json")))
    fail(`unknown module "${name}". See: node create.mjs list`);
  return { name, dir, ...readJson(join(dir, "module.json")) };
}

/** Sorts module names into presets.json `moduleOrder`. A later module's file wins. */
export function ordered(names) {
  const order = presets.moduleOrder;
  for (const name of names)
    if (!order.includes(name)) fail(`module "${name}" is missing from moduleOrder in presets.json`);
  return unique(names).sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

export const allModules = () =>
  ordered(
    readdirSync(join(ROOT, "modules")).filter((name) =>
      existsSync(join(ROOT, "modules", name, "module.json")),
    ),
  );

/** Fails unless every module supports the framework and its requires and conflicts hold. */
export function validate(fw, names) {
  const errors = [];
  for (const name of names) {
    const mod = moduleInfo(name);
    if (!mod.frameworks.includes(fw.name))
      errors.push(`${name} works with ${mod.frameworks.join(" or ")}, not ${fw.name}`);
    for (const need of mod.requires ?? [])
      if (!names.includes(need)) errors.push(`${name} needs ${need}`);
    for (const group of mod.requiresAny ?? [])
      if (!group.some((need) => names.includes(need)))
        errors.push(`${name} needs one of: ${group.join(", ")}`);
    for (const other of mod.conflicts ?? [])
      if (names.includes(other)) errors.push(`${name} and ${other} can't be used together`);
  }
  if (errors.length) fail(`these modules don't fit:\n  ${unique(errors).join("\n  ")}`);
}

/** Package names to `{ name: range }`, with ranges from versions.json. */
export function ranges(names, where) {
  return Object.fromEntries(
    (names ?? []).map((name) => {
      const range = versions.packages[name];
      if (!range) fail(`${where} uses "${name}", which has no range in versions.json`);
      return [name, range];
    }),
  );
}

/** pnpm overrides from versions.json that apply to this framework and module list. */
export const overridesFor = (fw, names) =>
  Object.entries(versions.overrides ?? {}).filter(
    ([, entry]) =>
      (!entry.frameworks || entry.frameworks.includes(fw.name)) &&
      (!entry.modules || entry.modules.some((name) => names.includes(name))),
  );

export const scaffoldMajor = (version) => Number(String(version ?? "0").split(".")[0]);
