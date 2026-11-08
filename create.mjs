#!/usr/bin/env node
// web-scaffold: start a project from a framework plus modules, add modules to one later, or take
// a demo live. No dependencies. The code lives in lib/; this file only reads the command line.
import { parseArgs } from "node:util";
import { pkg } from "./lib/catalog.mjs";
import { add, create, goLive, installSkill, printDocs, printList } from "./lib/commands.mjs";
import { ScaffoldError } from "./lib/util.mjs";

const HELP = `web-scaffold ${pkg.version}

  node create.mjs create --kind <kind> --name "<Name>" (--dir <path> | --group <group>) [options]
  node create.mjs add <module> [<module>...] [--dir <path>] [--force]
  node create.mjs go-live --url https://... --email ... [--hosting cf-git] [--with analytics]
  node create.mjs list [--json]
  node create.mjs docs [<module>...]
  node create.mjs install-skill [--dir <project>] [--force]

create options:
  --kind          demo | marketing | content | app | scratch
  --framework     astro | vite (default from the kind)
  --hosting       cf-git | cf-manual | firebase | none (default from the kind)
  --with a,b      add modules        --without a,b   drop modules
  --group         put the project in <devRoot>/<group>/<slug> (devRoot: scaffold.config.json)
  --slug --url --email --description --tagline --locale
  --plans         in-repo | none | <path or URL outside the repo>
  --nearby        "path=what it is;path=what it is" (written to CLAUDE.local.md)
  --no-install    skip pnpm install   --check   run pnpm check after install
  --git           git init and commit --push    also gh repo create and push
`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    kind: { type: "string" },
    framework: { type: "string" },
    hosting: { type: "string" },
    with: { type: "string" },
    without: { type: "string" },
    name: { type: "string" },
    dir: { type: "string" },
    group: { type: "string" },
    slug: { type: "string" },
    url: { type: "string" },
    email: { type: "string" },
    description: { type: "string" },
    tagline: { type: "string" },
    locale: { type: "string" },
    plans: { type: "string" },
    nearby: { type: "string" },
    "no-install": { type: "boolean" },
    check: { type: "boolean" },
    git: { type: "boolean" },
    push: { type: "boolean" },
    force: { type: "boolean" },
    json: { type: "boolean" },
    version: { type: "boolean", short: "v" },
  },
});
const options = { ...values, install: !values["no-install"] };
const [command, ...rest] = positionals;

const commands = {
  create: () => create(options),
  add: () => add(rest, options),
  "go-live": () => goLive(options),
  list: () => printList(options),
  docs: () => printDocs(rest),
  "install-skill": () => installSkill(options),
};

try {
  if (values.version) console.log(pkg.version);
  else if (commands[command]) commands[command]();
  else console.log(HELP);
} catch (error) {
  if (!(error instanceof ScaffoldError)) throw error;
  console.error(`create.mjs: ${error.message}`);
  process.exit(1);
}
