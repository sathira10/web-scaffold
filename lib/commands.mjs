// The create.mjs commands: create, add, go-live, list, docs and install-skill.
import {
  appendFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
  allModules,
  config,
  framework,
  frameworkNames,
  HOSTING,
  kinds,
  moduleInfo,
  ordered,
  pkg as scaffoldPkg,
  ROOT,
  scaffoldMajor,
  validate,
  versions,
} from "./catalog.mjs";
import {
  buildAgents,
  buildCi,
  buildEnv,
  buildFirebase,
  buildGitignore,
  buildLocal,
  buildPackage,
  buildReadme,
  buildWorkspace,
  buildWrangler,
  docLine,
} from "./builders.mjs";
import {
  applyModuleFiles,
  applySiteChanges,
  copyTree,
  moduleFiles,
  pristineCheck,
  recordHashes,
  setSiteFlag,
  setSiteString,
} from "./files.mjs";
import { checkEmail, checkUrl, defaults, slugify, substitute } from "./substitute.mjs";
import {
  expandHome,
  fail,
  list,
  parseJsonc,
  read,
  readJson,
  run,
  walk,
  writeJson,
} from "./util.mjs";

// ---------------------------------------------------------------------------------------------
// Steps shared by create, add and go-live

// On create every module is new. On add, only the new modules' scripts, dependencies and
// wrangler settings are merged in, so edits to the existing files survive.
function writeGenerated(dir, fw, names, values, meta, { fresh, adding = [] }) {
  const mods = names.map(moduleInfo);
  const changed = fresh ? mods : adding.map(moduleInfo);
  const pkgPath = join(dir, "package.json");
  const pkg = buildPackage(fw, changed, values, fresh ? null : readJson(pkgPath), mods);
  writeJson(pkgPath, pkg);

  const wsPath = join(dir, "pnpm-workspace.yaml");
  writeFileSync(wsPath, buildWorkspace(fw, mods, existsSync(wsPath) ? read(wsPath) : null));

  const wranglerPath = join(dir, "wrangler.jsonc");
  const wrangler = buildWrangler(
    fresh ? mods : changed,
    existsSync(wranglerPath) ? parseJsonc(read(wranglerPath)) : null,
    mods,
  );
  if (wrangler) {
    writeFileSync(wranglerPath, wrangler);
    substitute(dir, ["wrangler.jsonc"], values, fw);
  }

  if (names.includes("host-firebase")) {
    writeJson(join(dir, "firebase.json"), buildFirebase(fw, names.includes("demo")));
    if (!existsSync(join(dir, ".firebaserc")))
      writeJson(join(dir, ".firebaserc"), { projects: { default: values.slug } });
  }

  if (names.includes("ci")) {
    mkdirSync(join(dir, ".github/workflows"), { recursive: true });
    writeFileSync(join(dir, ".github/workflows/ci.yml"), buildCi(names));
  }

  if (fresh) {
    writeFileSync(join(dir, ".nvmrc"), `${versions.node.lts}\n`);
    writeFileSync(join(dir, ".gitignore"), buildGitignore(mods));
    const env = buildEnv(mods);
    if (env) writeFileSync(join(dir, ".env.example"), env);
    if (meta.agentDocs) {
      writeFileSync(join(dir, "AGENTS.md"), buildAgents(fw, mods, names, values));
      cpSync(join(ROOT, "base/templates/CLAUDE.md"), join(dir, "CLAUDE.md"));
    }
    writeFileSync(join(dir, "CLAUDE.local.md"), buildLocal(meta.plans, meta.nearby));
    writeFileSync(join(dir, "README.md"), buildReadme(fw, mods, pkg));
  }

  const { files, version, ...previous } = meta;
  writeJson(join(dir, ".scaffold.json"), {
    ...previous,
    scaffold: "web-scaffold",
    scaffoldVersion: scaffoldPkg.version,
    created: meta.created,
    kind: values.kind,
    framework: fw.name,
    modules: names,
    agentDocs: meta.agentDocs,
    plans: meta.plans,
    values,
    files,
  });
  return pkg;
}

function finish(dir, names, { install, check }) {
  if (!install) return;
  // add changes package.json, so the lockfile must be allowed to move (CI sets frozen by default).
  run("pnpm", ["install", "--no-frozen-lockfile"], dir);
  for (const name of names)
    for (const command of moduleInfo(name).after ?? []) {
      const [bin, ...args] = command.split(" ");
      run(bin, args, dir);
    }
  run("pnpm", ["exec", "prettier", "--write", ".", "--log-level", "warn"], dir);
  if (check) {
    const pkg = readJson(join(dir, "package.json"));
    run("pnpm", [pkg.scripts.check ? "check" : "build"], dir);
  }
}

function nextSteps(names, heading = "Still to do") {
  const mods = names.map(moduleInfo);
  const lines = mods.flatMap((mod) => mod.manual ?? []);
  if (lines.length) console.log(`\n${heading}:\n${lines.map((l) => `  - ${l}`).join("\n")}`);
  const docs = mods.filter((mod) => mod.docs?.length);
  if (docs.length)
    console.log(
      `\nDocs:\n${docs.flatMap((mod) => mod.docs.map((d) => `  - ${mod.name}: ${d.label} ${d.url}`)).join("\n")}`,
    );
}

/** The module list for a new project: the kind's defaults, hosting swapped, --with/--without. */
export function resolveModules(kind, options) {
  const preset = kinds[kind];
  let names = [...preset.modules];
  if (options.hosting) {
    names = names.filter((name) => !name.startsWith("host-"));
    if (options.hosting !== "none") {
      if (!HOSTING[options.hosting])
        fail(`--hosting must be one of: ${Object.keys(HOSTING).join(", ")}, none`);
      names.push(HOSTING[options.hosting]);
    }
  }
  names.push(...list(options.with));
  names = ordered(names.filter((name) => !list(options.without).includes(name)));
  const plans = options.plans ?? (names.includes("plans-in-repo") ? "in-repo" : "none");
  if (plans === "in-repo" && !names.includes("plans-in-repo"))
    names = ordered([...names, "plans-in-repo"]);
  return { names, plans };
}

function targetDir(options) {
  if (options.dir) return resolve(expandHome(options.dir));
  if (options.group)
    return join(
      expandHome(config.devRoot ?? "~/dev"),
      options.group,
      options.slug ?? slugify(options.name),
    );
  fail("--dir (or --group, which uses devRoot from scaffold.config.json) is required");
}

function loadProject(dir) {
  const path = join(dir, ".scaffold.json");
  if (!existsSync(path)) fail(`${dir} has no .scaffold.json; it wasn't made with web-scaffold`);
  const project = readJson(path);
  const made = project.scaffoldVersion ?? "1.0.0";
  if (scaffoldMajor(made) < scaffoldMajor(scaffoldPkg.version))
    console.warn(
      `warning: this project was made with web-scaffold ${made}; this is ${scaffoldPkg.version}.\n` +
        `Read ${join(ROOT, "CHANGELOG.md")} for breaking changes before adding modules.`,
    );
  return project;
}

// ---------------------------------------------------------------------------------------------
// Commands

export function create(options) {
  const kind = options.kind;
  const preset = kinds[kind];
  if (!preset) fail(`--kind must be one of: ${Object.keys(kinds).join(", ")}`);
  if (!options.name) fail("--name is required");
  const dir = targetDir(options);
  if (existsSync(dir) && readdirSync(dir).length) fail(`${dir} exists and is not empty`);

  const fw = framework(options.framework ?? preset.framework);
  const { names, plans } = resolveModules(kind, options);
  validate(fw, names);

  const values = defaults(options, kind);
  const meta = {
    created: new Date().toISOString().slice(0, 10),
    agentDocs: preset.agentDocs !== false,
    plans,
    nearby: options.nearby,
  };

  console.log(`Creating ${kind} (${fw.name}) in ${dir}\nModules: ${names.join(", ") || "none"}`);
  mkdirSync(dir, { recursive: true });
  copyTree(join(ROOT, "base/files"), dir);
  copyTree(join(fw.dir, "files"), dir);
  for (const name of names) applyModuleFiles(dir, moduleInfo(name), fw);
  writeGenerated(dir, fw, names, values, meta, { fresh: true });
  for (const name of names) applySiteChanges(dir, moduleInfo(name));
  substitute(dir, walk(dir), values, fw);

  finish(dir, names, options);
  recordHashes(dir);

  if (options.git) {
    const git = config.git ?? {};
    run("git", ["init", "-b", git.branch ?? "main", "-q"], dir);
    run("git", ["add", "-A"], dir);
    const message = (git.commitMessage ?? "chore: scaffold {kind} project").replace("{kind}", kind);
    run("git", ["commit", "-q", "-m", message], dir);
    if (options.push)
      run(
        "gh",
        [
          "repo",
          "create",
          values.slug,
          `--${git.githubVisibility ?? "private"}`,
          "--source",
          ".",
          "--push",
        ],
        dir,
      );
  }

  console.log(`\nDone: ${dir}`);
  nextSteps(names);
  return dir;
}

export function add(moduleNames, options) {
  const dir = resolve(expandHome(options.dir ?? "."));
  const project = loadProject(dir);
  const fw = framework(project.framework);
  const adding = moduleNames.filter((name) => !project.modules.includes(name));
  if (!adding.length) return console.log("Nothing to add: every module is already installed.");
  const names = ordered([...project.modules, ...adding]);
  validate(fw, names);

  const conflicts = [];
  const written = [];
  const pristine = pristineCheck(dir, project);
  for (const name of adding)
    written.push(
      ...applyModuleFiles(dir, moduleInfo(name), fw, { force: options.force, conflicts, pristine }),
    );
  if (conflicts.length)
    console.warn(
      `\nKept your version of these files (rerun with --force to replace them):\n  ${conflicts.join("\n  ")}`,
    );
  substitute(dir, written, project.values, fw);

  const mods = adding.map(moduleInfo);
  writeGenerated(dir, fw, names, project.values, project, { fresh: false, adding });
  for (const mod of mods) {
    applySiteChanges(dir, mod);
    if (mod.env?.length)
      appendFileSync(join(dir, ".env.example"), "\n" + mod.env.join("\n") + "\n");
    const ignore = join(dir, ".gitignore");
    for (const line of mod.gitignore ?? [])
      if (!read(ignore).split("\n").includes(line)) appendFileSync(ignore, line + "\n");
    addToAgents(dir, mod);
  }
  appendServices(dir, mods);

  // Post-install steps run for every module: a new binding (d1) changes worker-api's types too.
  finish(dir, names, options);
  recordHashes(dir);
  console.log(`\nAdded: ${adding.join(", ")}`);
  nextSteps(adding);
}

function addToAgents(dir, mod) {
  const path = join(dir, "AGENTS.md");
  if (!existsSync(path)) return;
  let text = read(path);
  for (const [section, lines] of [
    ["Boundaries", mod.agents?.boundaries ?? []],
    ["Pitfalls", mod.agents?.pitfalls ?? []],
  ]) {
    for (const line of lines) {
      if (text.includes(line)) continue;
      text = text.replace(new RegExp(`(## ${section}\\n\\n)`), `$1- ${line}\n`);
    }
  }
  writeFileSync(path, text.replace(/<!-- (None yet|Added when a mistake repeats)\. -->\n?/g, ""));
}

function removeFromAgents(dir, mod) {
  const path = join(dir, "AGENTS.md");
  if (!existsSync(path)) return;
  let text = read(path);
  for (const line of [...(mod.agents?.boundaries ?? []), ...(mod.agents?.pitfalls ?? [])])
    text = text.replace(`- ${line}\n`, "");
  writeFileSync(path, text);
}

function appendServices(dir, mods) {
  const path = join(dir, "README.md");
  const lines = mods
    .filter((mod) => mod.docs?.length)
    .map((mod) => `- ${mod.name}: ${docLine(mod)}`);
  if (!existsSync(path) || !lines.length) return;
  const text = read(path);
  writeFileSync(
    path,
    text.replace(/(## Services and docs\n\n(?:- .*\n)*)/, `$1${lines.join("\n")}\n`),
  );
}

/** Deletes the files a module added, and its scripts. Used to retire demo and swap hosting. */
function removeModule(dir, fw, name) {
  const mod = moduleInfo(name);
  for (const file of moduleFiles(mod, fw)) rmSync(join(dir, file), { force: true });
  const pkgPath = join(dir, "package.json");
  const pkg = readJson(pkgPath);
  for (const key of Object.keys({ ...mod.scripts, ...mod.byFramework?.[fw.name]?.scripts }))
    delete pkg.scripts[key];
  writeJson(pkgPath, pkg);
  removeFromAgents(dir, mod);
}

export function goLive(options) {
  const dir = resolve(expandHome(options.dir ?? "."));
  const project = loadProject(dir);
  const fw = framework(project.framework);
  if (!project.modules.includes("demo")) fail("this project is not a demo build");
  const values = { ...project.values };
  if (options.url) values.url = checkUrl(options.url);
  if (options.email) values.email = checkEmail(options.email);
  if (/example\.com/.test(values.url) || /example\.com/.test(values.email))
    fail("set the real address first: --url https://... --email ...");

  let names = project.modules.filter((name) => name !== "demo");
  removeModule(dir, fw, "demo");
  setSiteFlag(dir, "demo", false);
  setSiteString(dir, "url", values.url);
  setSiteString(dir, "email", values.email);

  if (options.hosting) {
    const host = HOSTING[options.hosting];
    if (!host) fail(`--hosting must be one of: ${Object.keys(HOSTING).join(", ")}`);
    for (const old of names.filter((name) => name.startsWith("host-") && name !== host)) {
      removeModule(dir, fw, old);
      names = names.filter((name) => name !== old);
    }
  }
  writeJson(join(dir, ".scaffold.json"), { ...project, modules: names, values });
  // Regenerates firebase.json without X-Robots-Tag, and the check script.
  writeGenerated(dir, fw, names, values, { ...project, modules: names }, { fresh: false });

  const extra = [
    ...list(options.with),
    ...(options.hosting ? [HOSTING[options.hosting]] : []),
  ].filter((name) => !names.includes(name));
  if (extra.length) add(extra, { ...options, dir, force: true });
  else {
    finish(dir, [], options);
    recordHashes(dir);
  }

  console.log(
    "\nLive build: noindex, the robots.txt block, the demo banner and sample badges are gone." +
      "\nSearch the pages for sample content and placeholders before you deploy.",
  );
}

export function catalog() {
  return {
    version: scaffoldPkg.version,
    config,
    kinds,
    frameworks: frameworkNames(),
    hosting: [...Object.keys(HOSTING), "none"],
    modules: Object.fromEntries(
      allModules().map((name) => {
        const { description, frameworks, requires, requiresAny, conflicts, docs, manual } =
          moduleInfo(name);
        return [name, { description, frameworks, requires, requiresAny, conflicts, docs, manual }];
      }),
    ),
  };
}

export function printList({ json }) {
  if (json) return console.log(JSON.stringify(catalog(), null, 2));
  console.log(`web-scaffold ${scaffoldPkg.version}\n\nKinds:`);
  for (const [name, preset] of Object.entries(kinds))
    console.log(
      `  ${name.padEnd(10)} ${preset.label} (${preset.framework}): ${preset.modules.join(", ") || "no modules"}`,
    );
  console.log("\nModules:");
  for (const name of allModules()) {
    const mod = moduleInfo(name);
    console.log(`  ${name.padEnd(15)} [${mod.frameworks.join(", ")}] ${mod.description}`);
  }
  console.log(`\nHosting: --hosting ${Object.keys(HOSTING).join(" | ")} | none`);
}

export function printDocs(names) {
  for (const name of names.length ? names : allModules()) {
    const mod = moduleInfo(name);
    console.log(`${name}:`);
    for (const doc of mod.docs ?? []) console.log(`  ${doc.label}: ${doc.url}`);
  }
}

/** Links each skill in skills/ into ~/.claude/skills (or <dir>/.claude/skills with --dir). */
export function installSkill(options) {
  const base = options.dir
    ? join(resolve(expandHome(options.dir)), ".claude/skills")
    : join(homedir(), ".claude/skills");
  mkdirSync(base, { recursive: true });
  for (const name of readdirSync(join(ROOT, "skills"))) {
    const source = join(ROOT, "skills", name);
    const target = join(base, name);
    let existing = null;
    try {
      existing = lstatSync(target);
    } catch {
      // nothing there yet
    }
    if (existing && !existing.isSymbolicLink() && !options.force)
      fail(`${target} exists and isn't a link. Move it, or rerun with --force to replace it.`);
    if (existing) rmSync(target, { recursive: true, force: true });
    symlinkSync(source, target);
    console.log(`Linked ${target} -> ${source}`);
  }
}
