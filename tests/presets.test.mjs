// The slow test: generates every case in tests/cases.mjs with a real install, then in each runs
//   pnpm check (pnpm build for scratch), wrangler deploy --dry-run when there's a wrangler.jsonc,
//   pnpm audit (no advisories beyond versions.json auditIgnore),
//   pnpm outdated (nothing beyond versions.json holds),
//   and with --e2e the Playwright tests.
// Usage: node tests/presets.test.mjs [--out <dir>] [--only <case,case>] [--e2e]
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { cases } from "./cases.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const versions = JSON.parse(readFileSync(join(ROOT, "versions.json"), "utf8"));
const { values } = parseArgs({
  options: { out: { type: "string" }, only: { type: "string" }, e2e: { type: "boolean" } },
});
const out = values.out ?? join(tmpdir(), "web-scaffold-presets");
const only = values.only?.split(",");

const sh = (command, args, cwd) =>
  execFileSync(command, args, { cwd, stdio: "inherit", env: { ...process.env, CI: "1" } });

/** pnpm commands that exit non-zero to report findings; returns parsed JSON output. */
function pnpmJson(args, cwd) {
  const result = spawnSync("pnpm", [...args, "--json"], { cwd, encoding: "utf8" });
  try {
    return JSON.parse(result.stdout || "{}");
  } catch {
    throw new Error(`pnpm ${args.join(" ")} printed no JSON:\n${result.stdout}${result.stderr}`);
  }
}

function checkAudit(dir) {
  const waived = new Set((versions.auditIgnore ?? []).map((w) => w.id));
  const advisories = Object.values(pnpmJson(["audit"], dir).advisories ?? {});
  const open = advisories.filter(
    (a) => !waived.has(a.github_advisory_id) && !waived.has(String(a.id)),
  );
  if (open.length)
    throw new Error(
      `pnpm audit:\n${open.map((a) => `  ${a.severity} ${a.module_name}: ${a.title} (${a.url})`).join("\n")}`,
    );
}

function checkOutdated(dir) {
  const held = new Set(Object.keys(versions.holds ?? {}));
  const outdated = Object.entries(pnpmJson(["outdated"], dir)).filter(([name]) => !held.has(name));
  if (outdated.length)
    throw new Error(
      `pnpm outdated (not in versions.json holds):\n${outdated
        .map(([name, info]) => `  ${name} ${info.current} -> ${info.latest}`)
        .join("\n")}`,
    );
}

const results = [];
mkdirSync(out, { recursive: true });
for (const [name, args, followUps] of cases) {
  if (only && !only.includes(name)) continue;
  const dir = join(out, name);
  rmSync(dir, { recursive: true, force: true });
  const started = Date.now();
  try {
    sh("node", ["create.mjs", "create", ...args, "--dir", dir], ROOT);
    for (const [command, ...rest] of followUps)
      sh("node", ["create.mjs", command, ...rest, "--dir", dir], ROOT);
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    sh("pnpm", [pkg.scripts.check ? "check" : "build"], dir);
    if (existsSync(join(dir, "wrangler.jsonc")))
      sh("pnpm", ["wrangler", "deploy", "--dry-run"], dir);
    checkAudit(dir);
    checkOutdated(dir);
    if (values.e2e && pkg.scripts["test:e2e"]) sh("pnpm", ["test:e2e"], dir);
    results.push([name, "ok", Date.now() - started]);
  } catch (error) {
    console.error(`\n[${name}] ${error.message}`);
    results.push([name, "FAILED", Date.now() - started]);
  }
}

console.log("\nResults:");
for (const [name, status, ms] of results)
  console.log(`  ${status.padEnd(6)} ${name} (${Math.round(ms / 1000)}s)`);
console.log(`Projects are in ${out}`);
if (results.some(([, status]) => status !== "ok")) process.exit(1);
