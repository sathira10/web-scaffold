// The fast test (seconds, no install): config files match their schemas, every package has a
// range, the skill version matches, and every case in tests/cases.mjs generates cleanly with
// --no-install. Run with `pnpm test`. The slow, installing test is tests/presets.test.mjs.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, test } from "node:test";
import { kinds, presets, ROOT, versions } from "../lib/catalog.mjs";
import { setSiteString } from "../lib/files.mjs";
import { checkEmail, checkUrl, replaceTokens } from "../lib/substitute.mjs";
import { merge, parseJsonc, walk } from "../lib/util.mjs";
import { cases } from "./cases.mjs";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const modules = readdirSync(join(ROOT, "modules")).filter((name) =>
  existsSync(join(ROOT, "modules", name, "module.json")),
);
const frameworks = readdirSync(join(ROOT, "frameworks"));
const moduleJson = (name) => readJson(join(ROOT, "modules", name, "module.json"));
const frameworkJson = (name) => readJson(join(ROOT, "frameworks", name, "framework.json"));

// ---------------------------------------------------------------------------------------------
// A small JSON Schema checker: type, required, properties, additionalProperties, items, enum,
// pattern and $ref. Enough for the schemas in schemas/.

function check(schema, value, path, schemaFile, errors) {
  if (schema.$ref) {
    const [file, pointer] = schema.$ref.split("#");
    const target = file ? join(dirname(schemaFile), file) : schemaFile;
    let resolved = readJson(target);
    for (const key of pointer.split("/").filter(Boolean)) resolved = resolved[key];
    return check(resolved, value, path, target, errors);
  }
  const type = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
  if (schema.type && schema.type !== type)
    return errors.push(`${path}: expected ${schema.type}, got ${type}`);
  if (schema.enum && !schema.enum.includes(value))
    errors.push(`${path}: ${JSON.stringify(value)} not in ${schema.enum}`);
  if (schema.pattern && type === "string" && !new RegExp(schema.pattern).test(value))
    errors.push(`${path}: "${value}" doesn't match ${schema.pattern}`);
  if (type === "array" && schema.items)
    value.forEach((item, i) => check(schema.items, item, `${path}[${i}]`, schemaFile, errors));
  if (type === "object") {
    for (const key of schema.required ?? [])
      if (!(key in value)) errors.push(`${path}: missing ${key}`);
    for (const [key, child] of Object.entries(value)) {
      const sub = schema.properties?.[key] ?? schema.additionalProperties;
      if (sub === false) errors.push(`${path}: unknown field "${key}"`);
      else if (sub && typeof sub === "object")
        check(sub, child, `${path}.${key}`, schemaFile, errors);
    }
  }
  return errors;
}

function assertSchema(file) {
  const data = readJson(join(ROOT, file));
  const schemaFile = join(dirname(join(ROOT, file)), data.$schema);
  const errors = check(readJson(schemaFile), data, file, schemaFile, []);
  assert.deepEqual(errors, [], errors.join("\n"));
}

describe("schemas", () => {
  test("the checker catches mistakes", () => {
    const schemaFile = join(ROOT, "schemas/module.schema.json");
    const bad = {
      description: "x",
      frameworks: ["svelte"],
      devDependencies: { eslint: "^9" },
      typo: 1,
    };
    const errors = check(readJson(schemaFile), bad, "bad", schemaFile, []);
    assert.equal(errors.length, 3, errors.join("\n"));
  });
  for (const file of ["presets.json", "versions.json", "scaffold.config.json"])
    test(file, () => assertSchema(file));
  for (const name of modules)
    test(`modules/${name}`, () => assertSchema(`modules/${name}/module.json`));
  for (const name of frameworks)
    test(`frameworks/${name}`, () => assertSchema(`frameworks/${name}/framework.json`));
});

// ---------------------------------------------------------------------------------------------

describe("catalog", () => {
  const used = new Set();
  for (const item of [...modules.map(moduleJson), ...frameworks.map(frameworkJson)])
    for (const part of [item, ...Object.values(item.byFramework ?? {})])
      for (const name of [...(part.dependencies ?? []), ...(part.devDependencies ?? [])])
        used.add(name);

  test("every package has a range in versions.json", () => {
    assert.deepEqual(
      [...used].filter((name) => !versions.packages[name]),
      [],
    );
  });
  test("every range in versions.json is used", () => {
    assert.deepEqual(
      Object.keys(versions.packages).filter((name) => !used.has(name)),
      [],
    );
  });
  test("every hold names a package", () => {
    assert.deepEqual(
      Object.keys(versions.holds ?? {}).filter((name) => !versions.packages[name]),
      [],
    );
  });
  test("moduleOrder lists every module once", () => {
    assert.deepEqual([...presets.moduleOrder].sort(), [...modules].sort());
  });
  test("kinds only name modules that exist", () => {
    for (const [kind, preset] of Object.entries(kinds))
      for (const name of [...preset.modules, ...(preset.optional ?? [])])
        assert.ok(modules.includes(name), `${kind} names unknown module ${name}`);
  });
  test("every module that wires up an outside tool links its docs", () => {
    const missing = modules.filter(
      (name) => name !== "plans-in-repo" && !moduleJson(name).docs?.length,
    );
    assert.deepEqual(missing, []);
  });
  test("module requires and conflicts name real modules", () => {
    for (const name of modules) {
      const mod = moduleJson(name);
      for (const other of [
        ...(mod.requires ?? []),
        ...(mod.conflicts ?? []),
        ...(mod.requiresAny ?? []).flat(),
      ])
        assert.ok(modules.includes(other), `${name} refers to unknown module ${other}`);
    }
  });
});

describe("versioning", () => {
  const version = readJson(join(ROOT, "package.json")).version;
  test("SKILL.md metadata.version matches package.json", () => {
    const skill = readFileSync(join(ROOT, "skills/new-site/SKILL.md"), "utf8");
    assert.match(skill, new RegExp(`\\n  version: "?${version.replace(/\./g, "\\.")}"?\\n`));
  });
  test("CHANGELOG has an entry for this version", () => {
    assert.match(
      readFileSync(join(ROOT, "CHANGELOG.md"), "utf8"),
      new RegExp(`## \\[${version}\\]`),
    );
  });
});

// ---------------------------------------------------------------------------------------------

describe("helpers", () => {
  test("merge unions arrays and deletes on null", () => {
    assert.deepEqual(merge({ a: [1], b: { c: 1, d: 2 } }, { a: [1, 2], b: { d: null } }), {
      a: [1, 2],
      b: { c: 1 },
    });
  });
  test("parseJsonc strips comments and trailing commas, keeps // in strings", () => {
    assert.deepEqual(parseJsonc('// c\n{ "url": "https://x", /* b */ "a": [1,], }'), {
      url: "https://x",
      a: [1],
    });
  });
  test("replaceTokens escapes per file type and leaves unknown tokens", () => {
    const map = { __NAME__: 'A "B" & <C>' };
    assert.equal(replaceTokens("x.ts", "'__NAME__' __OTHER__", map), `'A \\"B\\" & <C>' __OTHER__`);
    assert.equal(replaceTokens("x.astro", "__NAME__", map), "A &quot;B&quot; &amp; &lt;C>");
    assert.equal(replaceTokens("x.md", "__NAME__", map), 'A "B" & <C>');
  });
  test("checkUrl wants https and a bare host; checkEmail wants an address", () => {
    assert.equal(checkUrl("https://acme.test/"), "https://acme.test");
    for (const bad of ["http://acme.test", "https://acme.test/x", "acme.test", "https://a b"])
      assert.throws(() => checkUrl(bad), /--url/, bad);
    assert.equal(checkEmail("hi@acme.test"), "hi@acme.test");
    for (const bad of ["hi", "hi@acme", 'a"b@acme.test', "a b@acme.test"])
      assert.throws(() => checkEmail(bad), /--email/, bad);
  });
  test("setSiteString writes a $ in the value literally", () => {
    const dir = mkdtempSync(join(tmpdir(), "web-scaffold-site-"));
    try {
      mkdirSync(join(dir, "src/data"), { recursive: true });
      writeFileSync(join(dir, "src/data/site.ts"), 'export const site = {\n  email: "x",\n};\n');
      setSiteString(dir, "email", "a$`$&$'b@acme.test");
      assert.equal(
        readFileSync(join(dir, "src/data/site.ts"), "utf8"),
        'export const site = {\n  email: "a$`$&$\'b@acme.test",\n};\n',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------------------------

describe("generate every case without installing", () => {
  const out = mkdtempSync(join(tmpdir(), "web-scaffold-unit-"));
  after(() => rmSync(out, { recursive: true, force: true }));
  const create = (args) =>
    execFileSync("node", [join(ROOT, "create.mjs"), ...args, "--no-install"], {
      cwd: ROOT,
      stdio: "pipe",
    });

  for (const [name, args, followUps] of cases)
    test(name, () => {
      const dir = join(out, name);
      create(["create", ...args, "--dir", dir]);
      for (const [command, ...rest] of followUps) create([command, ...rest, "--dir", dir]);

      const pkg = readJson(join(dir, "package.json"));
      assert.equal(pkg.packageManager, `pnpm@${versions.pnpm}`);
      for (const [dep, range] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }))
        assert.equal(range, versions.packages[dep], `${dep} range`);
      assert.equal(readFileSync(join(dir, ".nvmrc"), "utf8").trim(), versions.node.lts);
      assert.equal(
        readJson(join(dir, ".scaffold.json")).scaffoldVersion,
        readJson(join(ROOT, "package.json")).version,
      );

      for (const file of walk(dir)) {
        if (/\.(png|jpg|webp|ico)$/.test(file)) continue;
        const text = readFileSync(join(dir, file), "utf8");
        assert.doesNotMatch(text, /\{\{[A-Z_]+\}\}/, `${file} has a template placeholder left`);
        assert.doesNotMatch(
          text,
          /__(NAME|SLUG|URL|EMAIL|DESCRIPTION|COMPAT_DATE)__/,
          `${file} has a token left`,
        );
      }
      const local = readFileSync(join(dir, "CLAUDE.local.md"), "utf8");
      assert.match(local, /Co-Authored-By/);
    });

  test("an unknown module fails with a message", () => {
    assert.throws(
      () =>
        create([
          "create",
          "--kind",
          "app",
          "--name",
          "X",
          "--with",
          "nope",
          "--dir",
          join(out, "bad"),
        ]),
      (error) => /missing from moduleOrder/.test(error.stderr.toString()),
    );
  });
  test("go-live refuses a URL or email that create would refuse", () => {
    const dir = join(out, "golive");
    create(["create", "--kind", "demo", "--name", "X", "--dir", dir]);
    for (const [flag, value] of [
      ["--url", "http://acme.test"],
      ["--url", "https://acme.test/x"],
      ["--email", "not-an-address"],
    ])
      assert.throws(
        () =>
          create([
            "go-live",
            "--url",
            "https://acme.test",
            "--email",
            "hi@acme.test",
            flag,
            value,
            "--dir",
            dir,
          ]),
        (error) => new RegExp(flag).test(error.stderr.toString()),
        `${flag} ${value}`,
      );
    assert.ok(readJson(join(dir, ".scaffold.json")).modules.includes("demo"), "nothing changed");
  });
  test("add keeps an edited file without --force", () => {
    const dir = join(out, "keep-edit");
    create(["create", "--kind", "app", "--name", "X", "--dir", dir]);
    const config = join(dir, "vite.config.ts");
    writeFileSync(config, "// mine\n");
    create(["add", "worker-api", "--dir", dir]);
    assert.equal(readFileSync(config, "utf8"), "// mine\n");
  });
  test("an unrelated add doesn't make an edited file look untouched", () => {
    const dir = join(out, "keep-edit-later");
    create(["create", "--kind", "app", "--name", "X", "--dir", dir]);
    const config = join(dir, "vite.config.ts");
    writeFileSync(config, "// mine\n");
    create(["add", "plans-in-repo", "--dir", dir]);
    create(["add", "worker-api", "--dir", dir]);
    assert.equal(readFileSync(config, "utf8"), "// mine\n");
  });
  test("add --force replaces an edited file", () => {
    const dir = join(out, "force-edit");
    create(["create", "--kind", "app", "--name", "X", "--dir", dir]);
    const config = join(dir, "vite.config.ts");
    writeFileSync(config, "// mine\n");
    create(["add", "worker-api", "--force", "--dir", dir]);
    assert.notEqual(readFileSync(config, "utf8"), "// mine\n");
  });
  test("analytics on a demo is refused", () => {
    assert.throws(
      () =>
        create([
          "create",
          "--kind",
          "demo",
          "--name",
          "X",
          "--with",
          "analytics",
          "--dir",
          join(out, "bad2"),
        ]),
      (error) => /can't be used together/.test(error.stderr.toString()),
    );
  });
});
