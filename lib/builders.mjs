// Files generated from module.json fields rather than copied: package.json, pnpm-workspace.yaml,
// wrangler.jsonc, firebase.json, the CI workflow, the agent files, README, .env.example and
// .gitignore.
import { join } from "node:path";
import {
  config,
  kinds,
  overridesFor,
  pkg as scaffoldPkg,
  ranges,
  ROOT,
  versions,
} from "./catalog.mjs";
import { bullets, merge, read, sortKeys, unique } from "./util.mjs";

const SCRIPT_NOTES = {
  dev: "local dev server",
  build: "production build into `dist/`",
  preview: "serve the build locally",
  format: "format every file with Prettier",
  lint: "ESLint and a Prettier check",
  typecheck: "TypeScript",
  test: "unit tests (Vitest)",
  "check:tokens": "fails on raw colors outside `design-system/tokens.css`",
  "check:site": "checks the built HTML: landmarks, CSP hashes, links, starter text",
  check: "the gate: run before every commit",
  "test:e2e": "browser tests: layout matrix and axe (Playwright)",
  "audit:matrix": "the e2e matrix with screenshots in `.audit/<label>/`",
  assets: "favicons, app icons and the social image from `design-system/assets/mark.svg`",
  deploy: "build and deploy from this machine",
  "deploy:preview": "build and deploy a preview channel",
  "types:worker": "regenerate `worker-configuration.d.ts` from `wrangler.jsonc`",
  "db:generate": "SQL migration from `src/db/schema.ts`",
  "db:migrate:local": "apply migrations to the local D1",
};

/** A module's own fields plus its byFramework part for this framework. */
const parts = (item, fw) => [item, item.byFramework?.[fw.name] ?? {}];

export function buildPackage(fw, mods, values, existing, allMods = mods) {
  const pkg = existing ?? {
    name: values.slug,
    private: true,
    type: "module",
    version: "0.0.0",
    packageManager: `pnpm@${versions.pnpm}`,
    engines: { node: `>=${versions.node.min}` },
    scripts: { ...fw.scripts },
    dependencies: ranges(fw.dependencies, `framework ${fw.name}`),
    devDependencies: ranges(fw.devDependencies, `framework ${fw.name}`),
  };
  pkg.scripts ??= {};
  for (const mod of mods)
    for (const part of parts(mod, fw)) {
      Object.assign(pkg.scripts, part.scripts);
      Object.assign((pkg.dependencies ??= {}), ranges(part.dependencies, `module ${mod.name}`));
      Object.assign(
        (pkg.devDependencies ??= {}),
        ranges(part.devDependencies, `module ${mod.name}`),
      );
    }
  const steps = allMods.flatMap((mod) => mod.checkSteps ?? []);
  if (steps.length)
    pkg.scripts.check = unique(steps)
      .map((step) => `pnpm ${step}`)
      .join(" && ");
  pkg.dependencies = sortKeys(pkg.dependencies);
  pkg.devDependencies = sortKeys(pkg.devDependencies);
  return pkg;
}

export function buildWorkspace(fw, mods, existingText) {
  const builds = new Set(fw.allowBuilds ?? []);
  for (const mod of mods) for (const name of mod.allowBuilds ?? []) builds.add(name);
  for (const match of (existingText ?? "").matchAll(/^\s{2}([@\w/.-]+): true/gm))
    builds.add(match[1]);
  let text =
    "# Single package, not a workspace. pnpm reads its settings from this file.\n" +
    "# Dependencies allowed to run install scripts; everything else is blocked.\n" +
    "allowBuilds:\n" +
    [...builds]
      .sort()
      .map((name) => `  ${name}: true\n`)
      .join("") +
    "\n# Don't install a release younger than a day (minutes). Most hijacked releases are caught\n" +
    "# and pulled within hours.\n" +
    "minimumReleaseAge: 1440\n";
  const overrides = overridesFor(
    fw,
    mods.map((mod) => mod.name),
  );
  if (overrides.length) {
    text += "\noverrides:\n";
    for (const [name, entry] of overrides)
      text += `  # ${entry.reason}\n  "${name}": ${entry.version}\n`;
  }
  return text;
}

export function buildWrangler(mods, existing, allMods = mods) {
  const fragments = mods.filter((mod) => mod.wrangler);
  if (!fragments.length && !existing) return null;
  const wrangler = existing ?? {};
  for (const mod of fragments) merge(wrangler, mod.wrangler);
  const notes = allMods.flatMap((mod) => mod.wranglerNotes ?? []);
  const header = notes.map((line) => `// ${line}`).join("\n");
  const ordered = { $schema: wrangler.$schema, name: wrangler.name, ...wrangler };
  return (header ? header + "\n" : "") + JSON.stringify(ordered, null, 2) + "\n";
}

const SECURITY_HEADERS = [
  ["Strict-Transport-Security", "max-age=31536000"],
  ["X-Frame-Options", "DENY"],
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"],
];
// Astro writes the rest of the policy into each page; a header carries what a meta tag can't.
const CSP = {
  astro: "frame-ancestors 'none'; upgrade-insecure-requests",
  vite:
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
    "font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; " +
    "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
};

export function buildFirebase(fw, demo) {
  const headers = [["Content-Security-Policy", CSP[fw.name]], ...SECURITY_HEADERS];
  if (demo) headers.push(["X-Robots-Tag", "noindex, nofollow"]);
  const hosting = {
    public: "dist",
    cleanUrls: true,
    trailingSlash: false,
    ignore: ["firebase.json", "**/.*", "**/node_modules/**"],
    headers: [
      { source: "**", headers: headers.map(([key, value]) => ({ key, value })) },
      {
        source: `${fw.assetsDir}**`,
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ],
  };
  if (fw.name === "vite") hosting.rewrites = [{ source: "**", destination: "/index.html" }];
  return { hosting };
}

// Actions are pinned to commit SHAs from versions.json; `pnpm versions:bump` updates them.
const action = (key) => {
  const { repo, sha, ref } = versions.actions[key];
  return `${repo}@${sha} # ${ref}`;
};

export function buildCi(names) {
  const e2e = names.includes("e2e");
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-\${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: ${action("checkout")}
        with:
          persist-credentials: false
      - uses: ${action("pnpm")}
      - uses: ${action("node")}
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
${
  e2e
    ? `      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
`
    : ""
}`;
}

export function buildAgents(fw, mods, names, values) {
  const kind = kinds[values.kind]?.label ?? values.kind;
  const all = [fw, ...mods];
  return read(join(ROOT, "base/templates/AGENTS.md"))
    .replace("{{ABOUT}}", `${values.description}\n\nA ${kind.toLowerCase()} project.`)
    .replace(
      "{{BOUNDARIES}}",
      bullets(
        all.flatMap((m) => m.agents?.boundaries ?? []),
        "<!-- None yet. -->",
      ),
    )
    .replace("{{STACK}}", fw.stack)
    .replace(
      "{{DESIGN}}",
      names.includes("design-system")
        ? "- Read `design-system/README.md` before adding UI. Build pages from the layout classes in\n  `design-system/layout.css` (`wrap`, `section`, `stack`, `cluster`, `grid-auto`, `prose`).\n- Check new color pairs with `pnpm test` (the contrast test)."
        : "",
    )
    .replace(
      "{{OPEN_ITEMS}}",
      names.includes("plans-in-repo") ? "`plans/OPEN-ITEMS.md`" : "the project's open items list",
    )
    .replace(
      "{{PITFALLS}}",
      bullets(
        all.flatMap((m) => m.agents?.pitfalls ?? []),
        "<!-- Added when a mistake repeats. -->",
      ),
    );
}

/** CLAUDE.local.md: the note partials named in scaffold.config.json, plans and nearby repos. */
export function buildLocal(plans, nearby) {
  let plan;
  if (plans === "in-repo")
    plan =
      "Plans and specs are in `plans/`. Read the plan for a task before editing, and update it\nwhen scope changes.";
  else if (plans && plans !== "none")
    plan = `Plans live outside this repo: ${plans}\nRead the plan for a task before editing, and update it when scope changes.`;
  else plan = "No plans yet. Ask where they should live before writing one.";
  const near = (nearby ?? "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [path, ...note] = entry.split("=");
      return note.length ? `\`${path}\`: ${note.join("=")}` : `\`${path}\``;
    });
  const notes = (config.localNotes ?? [])
    .map((name) => read(join(ROOT, "base/templates/local", `${name}.md`)).trim())
    .join("\n\n");
  return read(join(ROOT, "base/templates/CLAUDE.local.md"))
    .replace("{{NOTES}}\n\n", notes ? `${notes}\n\n` : "")
    .replace("{{PLANS}}", plan)
    .replace("{{SIBLINGS}}", bullets(near, "- None noted yet."));
}

export const docLine = (item) => item.docs?.map((doc) => `[${doc.label}](${doc.url})`).join(", ");

export function buildReadme(fw, mods, pkg) {
  const commands = Object.keys(pkg.scripts)
    .filter((name) => name !== "prepare")
    .map((name) => `- \`pnpm ${name}\`${SCRIPT_NOTES[name] ? `: ${SCRIPT_NOTES[name]}` : ""}`);
  const services = [`- ${fw.label}: ${docLine(fw)}`];
  for (const mod of mods) if (mod.docs?.length) services.push(`- ${mod.name}: ${docLine(mod)}`);
  const next = mods.flatMap((mod) => mod.manual ?? []);
  return read(join(ROOT, "base/templates/README.md"))
    .replace("{{FRAMEWORK}}", fw.label)
    .replace("{{COMMANDS}}", commands.join("\n"))
    .replace("{{SERVICES}}", services.join("\n"))
    .replace("{{NEXT}}", bullets(next, "Nothing noted."))
    .replace("{{SCAFFOLD_VERSION}}", scaffoldPkg.version);
}

export function buildEnv(mods) {
  const blocks = mods.filter((mod) => mod.env?.length).map((mod) => mod.env.join("\n"));
  if (!blocks.length) return null;
  return (
    "# Public values only: the PUBLIC_ prefix is exposed to the browser. Secrets never go here.\n" +
    "# Copy to .env for local builds, and set the same names as build variables on the host.\n\n" +
    blocks.join("\n\n") +
    "\n"
  );
}

export function buildGitignore(mods) {
  const extra = mods.flatMap((mod) => mod.gitignore ?? []);
  return (
    read(join(ROOT, "base/templates/gitignore")) +
    (extra.length ? "\n" + extra.join("\n") + "\n" : "")
  );
}
