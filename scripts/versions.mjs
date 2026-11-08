#!/usr/bin/env node
// Keeps versions.json current. pnpm only (pnpm view), plus gh for GitHub Actions if installed.
//
//   node scripts/versions.mjs check   report new majors, lifted holds, deprecations, Node LTS,
//                                     action releases and an old compatibility date; exit 1 if
//                                     anything needs a person
//   node scripts/versions.mjs bump    raise every floor to the newest release within its major
//                                     that is at least a day old (matches minimumReleaseAge in
//                                     generated projects), update action SHAs within their major,
//                                     pnpm within its major, and the compatibility date
//
// A new major is never taken automatically: change the range in versions.json, run
// `pnpm test:presets`, and add a CHANGELOG entry.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const FILE = join(ROOT, "versions.json");
const DAY = 24 * 60 * 60 * 1000;
const MATURE = Date.now() - DAY;

// ---------------------------------------------------------------------------------------------
// Version helpers (enough semver for x.y.z ranges with ^ or ~)

const parse = (version) => {
  const match = /^(\d+)\.(\d+)\.(\d+)(-.+)?$/.exec(version);
  return match && { major: +match[1], minor: +match[2], patch: +match[3], pre: match[4] };
};
const compare = (a, b) => {
  const [x, y] = [parse(a), parse(b)];
  return x.major - y.major || x.minor - y.minor || x.patch - y.patch;
};
/** What "the same major" means for a range: ^1.2.3 -> "1", ^0.4.5 -> "0.4", ~6.0.3 -> "6.0". */
const lineOf = (range) => {
  const op = range[0];
  const v = parse(range.slice(1));
  if (op === "~" || v.major === 0) return `${v.major}.${v.minor}`;
  return `${v.major}`;
};
const lineOfVersion = (version, like) => {
  const v = parse(version);
  return like.includes(".") ? `${v.major}.${v.minor}` : `${v.major}`;
};
/** The highest major a peer range allows, or Infinity for an open range like ">=4". */
const peerCeiling = (range) => {
  if (!range) return null;
  let ceiling = 0;
  for (const part of range.split("||")) {
    const p = part.trim();
    if (/^>=?\s*[\d.]+$/.test(p) || p === "*") return Infinity;
    const lt = /<\s*(\d+)\.(\d+)/.exec(p);
    if (lt) {
      ceiling = Math.max(ceiling, +lt[2] > 0 ? +lt[1] : +lt[1] - 1);
      continue;
    }
    const caret = /[\^~]?\s*(\d+)/.exec(p);
    if (caret) ceiling = Math.max(ceiling, +caret[1]);
  }
  return ceiling;
};

// ---------------------------------------------------------------------------------------------
// Registry (pnpm view) and GitHub (gh api)

const cache = new Map();
function view(name) {
  if (!cache.has(name)) {
    const out = execFileSync("pnpm", ["view", name, "--json"], { encoding: "utf8" });
    cache.set(name, JSON.parse(out));
  }
  return cache.get(name);
}
const stableMature = (info) =>
  info.versions.filter((v) => parse(v) && !parse(v).pre && Date.parse(info.time[v]) <= MATURE);
const newestIn = (info, line) =>
  stableMature(info)
    .filter((v) => lineOfVersion(v, line) === line)
    .sort(compare)
    .at(-1);
const newestOverall = (info) => stableMature(info).sort(compare).at(-1);

const hasGh = (() => {
  try {
    execFileSync("gh", ["auth", "status"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
const gh = (path) => JSON.parse(execFileSync("gh", ["api", path], { encoding: "utf8" }));

// ---------------------------------------------------------------------------------------------

const versions = JSON.parse(readFileSync(FILE, "utf8"));
const [command = "check"] = process.argv.slice(2);
const report = { action: [], info: [] };
const say = (level, line) => report[level].push(line);

// npm packages
for (const [name, range] of Object.entries(versions.packages)) {
  const info = view(name);
  const line = lineOf(range);
  const floor = range.slice(1);
  const best = newestIn(info, line);
  const top = newestOverall(info);
  if (info.deprecated) say("action", `${name} is deprecated: ${info.deprecated}`);
  const young = !info.time[floor] || Date.parse(info.time[floor]) > MATURE;
  if (young && best && command === "bump") versions.packages[name] = range[0] + best;
  else if (young)
    say(
      "action",
      `${name}: floor ${floor} is under a day old, so installs fail (pnpm versions:bump)`,
    );
  else if (best && compare(best, floor) > 0) {
    if (command === "bump") versions.packages[name] = range[0] + best;
    else say("info", `${name}: floor ${floor} -> ${best} available (pnpm versions:bump)`);
  }
  if (top && lineOfVersion(top, line) !== line && compare(top, floor) > 0) {
    const hold = versions.holds?.[name];
    if (!hold)
      say(
        "action",
        `${name}: new major ${top} (range ${range}). Try it, then change versions.json.`,
      );
    else if (hold.blockedBy) {
      const topMajor = parse(top).major;
      const lifted = hold.blockedBy.filter((blocker) => {
        const peers = newestOverall(view(blocker)) && view(blocker).peerDependencies;
        const ceiling = peerCeiling(peers?.[name]);
        return ceiling === null || ceiling >= topMajor;
      });
      if (lifted.length === hold.blockedBy.length)
        say(
          "action",
          `${name}: hold may be lifted, ${hold.blockedBy.join(" and ")} now allow ${top}`,
        );
      else say("info", `${name}: held at ${range} (${hold.reason})`);
    } else if (hold.follows === "node.lts") {
      if (String(parse(top).major) === versions.node.lts || line !== versions.node.lts)
        say("action", `${name}: range ${range} should follow node.lts ${versions.node.lts}`);
      else say("info", `${name}: held at ${range} (${hold.reason})`);
    } else say("info", `${name}: held at ${range} (${hold.reason})`);
  }
}

// Holds that no longer hold anything back.
for (const name of Object.keys(versions.holds ?? {}))
  if (!versions.packages[name]) say("action", `hold for ${name}, which isn't in packages`);

// pnpm itself
{
  const info = view("pnpm");
  const current = versions.pnpm;
  const line = String(parse(current).major);
  const best = newestIn(info, line);
  const top = newestOverall(info);
  if (best && compare(best, current) > 0) {
    if (command === "bump") versions.pnpm = best;
    else say("info", `pnpm: ${current} -> ${best} available`);
  }
  if (top && parse(top).major > +line) say("action", `pnpm: new major ${top}`);
}

// Node: .nvmrc follows the Active LTS line; engines accept the oldest line still supported.
try {
  const schedule = await (
    await fetch("https://raw.githubusercontent.com/nodejs/Release/main/schedule.json")
  ).json();
  const today = new Date().toISOString().slice(0, 10);
  const lines = Object.entries(schedule).filter(
    ([, s]) => s.lts && s.lts <= today && s.end > today,
  );
  const active = lines
    .filter(([, s]) => s.maintenance > today)
    .map(([k]) => k.slice(1))
    .at(-1);
  const oldest = lines.map(([k]) => k.slice(1)).sort((a, b) => a - b)[0];
  if (active && active !== versions.node.lts)
    say("action", `Node: Active LTS is ${active}, node.lts is ${versions.node.lts}`);
  if (oldest && oldest !== versions.node.min)
    say("info", `Node: oldest supported LTS is ${oldest}, node.min is ${versions.node.min}`);
} catch {
  say("info", "Node: couldn't fetch the release schedule");
}

// GitHub Actions, pinned to SHAs.
if (hasGh) {
  for (const entry of Object.values(versions.actions)) {
    const tags = gh(`repos/${entry.repo}/releases?per_page=30`).map((r) => r.tag_name);
    const major = entry.ref.split(".")[0];
    const sameMajor = tags.filter((t) => t.split(".")[0] === major && parse(t.slice(1)));
    const best = sameMajor.sort((a, b) => compare(a.slice(1), b.slice(1))).at(-1);
    const latest = tags.find((t) => parse(t.slice(1)) && !parse(t.slice(1)).pre);
    if (best && best !== entry.ref) {
      if (command === "bump") {
        entry.ref = best;
        entry.sha = gh(`repos/${entry.repo}/commits/${best}`).sha;
      } else say("info", `${entry.repo}: ${entry.ref} -> ${best} available`);
    }
    if (latest && latest.split(".")[0] !== major)
      say("action", `${entry.repo}: new major ${latest}`);
  }
} else say("info", "GitHub Actions: skipped (gh isn't installed or signed in)");

// Cloudflare compatibility date: the publish date of the wrangler floor, which that wrangler's
// workerd is sure to support.
{
  const wrangler = versions.packages.wrangler;
  if (wrangler) {
    const date = view("wrangler").time[wrangler.slice(1)]?.slice(0, 10);
    if (command === "bump" && date) versions.cloudflareCompatibilityDate = date;
    const age = (Date.now() - Date.parse(versions.cloudflareCompatibilityDate)) / DAY;
    if (command !== "bump" && age > 90)
      say(
        "info",
        `cloudflareCompatibilityDate is ${Math.round(age)} days old (pnpm versions:bump)`,
      );
  }
}

// Audit waivers expire.
for (const waiver of versions.auditIgnore ?? [])
  if (waiver.expires < new Date().toISOString().slice(0, 10))
    say("action", `audit waiver ${waiver.id} expired on ${waiver.expires}: ${waiver.reason}`);

if (command === "bump") {
  const before = readFileSync(FILE, "utf8");
  const after = JSON.stringify(versions, null, 2) + "\n";
  writeFileSync(FILE, after);
  try {
    execFileSync("pnpm", ["exec", "prettier", "--write", FILE], { cwd: ROOT, stdio: "ignore" });
  } catch {
    // Prettier isn't installed; the file is still valid JSON.
  }
  console.log(
    before === after
      ? "Nothing to bump."
      : "Updated versions.json. Review with: git diff versions.json",
  );
  console.log("Then run: pnpm test && pnpm test:presets");
}

for (const line of report.info) console.log(`  ${line}`);
for (const line of report.action) console.log(`! ${line}`);
if (command === "check") {
  console.log(
    report.action.length
      ? `\n${report.action.length} item(s) need a person.`
      : "\nNothing needs a person.",
  );
  if (report.action.length) process.exit(1);
}
