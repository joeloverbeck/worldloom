import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import Ajv2020Module from "ajv/dist/2020.js";
import type { AnySchema, ErrorObject, ValidateFunction } from "ajv";
import Database from "better-sqlite3";
import YAML from "js-yaml";
import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { validatePatchPlan } from "../../src/public/index.js";
import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { rule11ActionSpace } from "../../src/rules/rule11-action-space.js";
import { completeCf } from "../rules/helpers.js";
import { context, record, validSection } from "../structural/helpers.js";

type Ajv2020Instance = {
  addSchema(schema: AnySchema): unknown;
  compile(schema: AnySchema): ValidateFunction;
  errorsText(errors?: ErrorObject[] | null): string;
};
type Ajv2020Constructor = new (opts?: Record<string, unknown>) => Ajv2020Instance;
const Ajv2020 = Ajv2020Module as unknown as Ajv2020Constructor;
const packageRoot = resolvePackageRoot();
const repoRoot = path.resolve(packageRoot, "../..");
const realAnimaliaRoot = path.join(repoRoot, "tests", "fixtures", "animalia");
const cliPath = path.join(packageRoot, "dist", "src", "cli", "world-validate.js");

let tempRoot = "";
let tempWorldRoot = "";
let originalCwd = "";

before(async () => {
  tempRoot = mkdtempSync(path.join(os.tmpdir(), "spec09-"));
  tempWorldRoot = path.join(tempRoot, "worlds", "animalia");
  mkdirSync(path.dirname(tempWorldRoot), { recursive: true });
  copyDirectory(realAnimaliaRoot, tempWorldRoot);

  const { build } = await import("@worldloom/world-index/commands/build");
  assert.equal(build(tempRoot, "animalia"), 0);

  mkdirSync(path.join(tempRoot, "tools", "validators"), { recursive: true });
  originalCwd = process.cwd();
  process.chdir(path.join(tempRoot, "tools", "validators"));
});

after(() => {
  if (originalCwd) {
    process.chdir(originalCwd);
  }
  rmSync(tempRoot, { recursive: true, force: true });
});

test("SPEC-09 §V1: FOUNDATIONS edits land + YAML schema example parses", () => {
  const foundations = readFileSync(path.join(repoRoot, "docs", "FOUNDATIONS.md"), "utf8");

  assert.match(foundations, /Default Reality\./);
  assert.match(foundations, /### Rule 11: No Spectator Castes by Accident/);
  assert.match(foundations, /### Rule 12: No Single-Trace Truths/);
  assert.match(foundations, /\*Genesis-world rule\./);

  const schemaBlock = foundations.match(/## Canon Fact Record Schema[\s\S]*?```yaml\n([\s\S]*?)\n```/)?.[1];
  assert.ok(schemaBlock, "FOUNDATIONS Canon Fact Record Schema YAML block exists");
  const documents = YAML.loadAll(schemaBlock, undefined, { schema: YAML.JSON_SCHEMA });
  assert.equal(documents.length, 2);
});

test("SPEC-09 §V2: canon-fact-record.schema.json validates populated + n_a variants", () => {
  const validate = compileCanonFactSchema();
  for (const fixture of [
    "cf-with-populated-epistemic-profile.yaml",
    "cf-with-populated-exception-governance.yaml",
    "cf-with-na-blocks.yaml"
  ]) {
    const parsed = loadYamlFixture(fixture);
    assert.equal(validate(parsed), true, `${fixture}: ${JSON.stringify(validate.errors ?? [])}`);
  }
});

test("SPEC-09 §V3: world-validate exits 0 on animalia historical CFs (rules=11,12)", () => {
  const cfCount = countAnimaliaCFs(tempWorldRoot);
  assert.equal(cfCount, countAnimaliaCFs(realAnimaliaRoot));
  assert.ok(cfCount > 0, `expected animalia CF count to be re-enumerated, got ${cfCount}`);

  const result = runWorldValidate(tempRoot, "animalia", ["--rules=11,12", "--json"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("SPEC-09 §V4: capability CF without exception_governance FAILS record_schema_compliance", async () => {
  const cf = loadCanonFixtureRecord("cf-missing-required-block.yaml");
  const result = await recordSchemaCompliance.run(
    { files: [{ path: cf.file_path, content: YAML.dump(cf.parsed) }] },
    context([cf], { run_mode: "pre-apply", world_slug: "test" })
  );

  assert.ok(
    result.some((verdict) => verdict.code === "record_schema_compliance.missing_exception_governance")
  );
});

test("SPEC-09 §V5: rule-11-action-space FAILS when leverage missing or non-permissible", async () => {
  const cf = record("canon_fact_record", "CF-9006", "_source/canon/CF-9006.yaml", {
    ...completeCf,
    id: "CF-9006",
    type: "capability",
    exception_governance: {
      activation_conditions: ["training required"],
      rate_limits: ["seasonal"],
      mobility_limits: ["local only"],
      diffusion_barriers: ["guild guarded"],
      countermeasures: ["ordinary offices can deny permits"],
      nondeployment_reasons: ["costly"]
    },
    notes: "Rule 11 leverage: locality, access"
  });

  const result = await rule11ActionSpace.run({}, context([cf]));

  assert.deepEqual(result.map((verdict) => verdict.code), ["rule11.insufficient_leverage_forms"]);
});

test("SPEC-09 §V6: geography CF with n_a-blocks PASSES schema + Rule 11", async () => {
  const cf = loadCanonFixtureRecord("cf-with-na-blocks.yaml");
  const schemaResult = await recordSchemaCompliance.run(
    { files: [{ path: cf.file_path, content: YAML.dump(cf.parsed) }] },
    context([cf], { run_mode: "pre-apply", world_slug: "test" })
  );
  const rule11Result = await rule11ActionSpace.run({}, context([cf]));

  assert.deepEqual(schemaResult, []);
  assert.deepEqual(rule11Result, []);
});

test("SPEC-09 §V7: bare n_a (no fact-type keyword) FAILS rationale regex", async () => {
  const cf = loadCanonFixtureRecord("cf-with-bare-na.yaml");
  const result = await recordSchemaCompliance.run(
    { files: [{ path: cf.file_path, content: YAML.dump(cf.parsed) }] },
    context([cf], { run_mode: "pre-apply", world_slug: "test" })
  );

  assert.ok(result.some((verdict) => verdict.code === "record_schema_compliance.na_rationale_quality"));
});

test("SPEC-09 §V9: world-validate full-rule baseline reports known legacy character/proposal gaps", () => {
  const result = runWorldValidate(tempRoot, "animalia", ["--json"]);
  const parsed = JSON.parse(result.stderr || result.stdout) as {
    verdicts: Array<{ code: string; message: string; location: { node_id?: string; file?: string } }>;
    summary: { fail_count: number; warn_count: number; info_count: number };
  };

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.equal(parsed.summary.fail_count, 540);
  assert.equal(parsed.summary.warn_count, 0);
  assert.equal(parsed.summary.info_count, 0);
  assert.deepEqual(legacyCharacterDramaticCoreFailures(parsed.verdicts), [
    "CHAR-0001:characters/vespera-nightwhisper.md",
    "CHAR-0001:characters/vespera-nightwhisper.md",
    "CHAR-0002:characters/melissa-threadscar.md",
    "CHAR-0002:characters/melissa-threadscar.md"
  ]);
});

test("SPEC-09 §V10 (surrogate): patch-plan envelope for new animalia capability CF passes validatePatchPlan", async () => {
  const result = await validatePatchPlan(capabilityEnvelope("animalia", "CF-9998", "SEC-INS-998") as PatchPlanEnvelope);

  assert.deepEqual(legacyCharacterDramaticCoreFailures(result.verdicts), [
    "CHAR-0001:characters/vespera-nightwhisper.md",
    "CHAR-0002:characters/melissa-threadscar.md"
  ]);
  assert.deepEqual(result.verdicts.filter((verdict) => !isLegacyCharacterOrProposalShapeFailure(verdict)), []);
});

test("SPEC-09 §V11 (surrogate): patch-plan envelope for genesis-world bundle passes validatePatchPlan", async () => {
  createEmptyWorldIndex("seeded");

  const result = await validatePatchPlan(genesisEnvelope() as PatchPlanEnvelope);

  assert.deepEqual(result.verdicts, []);
});

function resolvePackageRoot(): string {
  for (const candidate of [
    process.cwd(),
    path.resolve(import.meta.dirname, "../../.."),
    path.resolve(import.meta.dirname, "../../../..")
  ]) {
    const packageJson = path.join(candidate, "package.json");
    if (!existsSync(packageJson)) {
      continue;
    }
    const parsed = JSON.parse(readFileSync(packageJson, "utf8")) as { name?: string };
    if (parsed.name === "@worldloom/validators") {
      return candidate;
    }
  }
  throw new Error("could not resolve @worldloom/validators package root");
}

function copyDirectory(from: string, to: string): void {
  cpSync(from, to, { recursive: true });
}

function compileCanonFactSchema(): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true, formats: { date: true } });
  ajv.addSchema(JSON.parse(readFileSync(path.join(packageRoot, "src", "schemas", "_shared", "extension-entry.schema.json"), "utf8")));
  return ajv.compile(
    JSON.parse(readFileSync(path.join(packageRoot, "src", "schemas", "canon-fact-record.schema.json"), "utf8"))
  );
}

function loadYamlFixture(name: string): unknown {
  return YAML.load(readFileSync(path.join(packageRoot, "tests", "fixtures", name), "utf8"), {
    schema: YAML.JSON_SCHEMA
  });
}

function loadCanonFixtureRecord(name: string) {
  const parsed = loadYamlFixture(name) as Record<string, unknown>;
  const id = String(parsed.id);
  return record("canon_fact_record", id, `_source/canon/${id}.yaml`, parsed);
}

function countAnimaliaCFs(worldRoot: string): number {
  return readdirSync(path.join(worldRoot, "_source", "canon")).filter((entry) => entry.endsWith(".yaml")).length;
}

function runWorldValidate(cwd: string, worldSlug: string, args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [cliPath, worldSlug, ...args], {
    cwd,
    encoding: "utf8"
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

function legacyCharacterDramaticCoreFailures(
  verdicts: Array<{ code: string; message: string; location: { node_id?: string; file?: string } }>
): string[] {
  return verdicts
    .filter(isLegacyCharacterDramaticCoreFailure)
    .map((verdict) => `${verdict.location.node_id}:${verdict.location.file}`)
    .sort();
}

function isLegacyCharacterDramaticCoreFailure(verdict: {
  code: string;
  message: string;
  location: { node_id?: string; file?: string };
}): boolean {
  return (
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("must have required property 'dramatic_core'") &&
    (verdict.location.node_id === "CHAR-0001" || verdict.location.node_id === "CHAR-0002")
  );
}

function isLegacyCharacterOrProposalShapeFailure(verdict: {
  validator: string;
  code: string;
  message: string;
  location: { node_id?: string; file?: string };
}): boolean {
  return (
    isLegacyCharacterDramaticCoreFailure(verdict) ||
    (
      isLegacyProposalSurface(verdict.location.file) &&
      verdict.validator === "record_schema_compliance"
    )
  );
}

function isLegacyProposalSurface(filePath: string | undefined): boolean {
  return (
    filePath?.startsWith("character-proposals/") === true ||
    filePath?.startsWith("proposals/") === true ||
    filePath?.startsWith("pressure-events/") === true ||
    filePath?.startsWith("audits/") === true ||
    filePath?.startsWith("world-proposals/") === true
  );
}

function capabilityEnvelope(world: string, cfId: string, secId: string) {
  return {
    plan_id: `spec09-${cfId}`,
    target_world: world,
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "canon-addition",
    expected_id_allocations: {},
    patches: [
      {
        op: "create_cf_record" as const,
        target_world: world,
        target_file: `_source/canon/${cfId}.yaml`,
        payload: {
          cf_record: capabilityCf(cfId, { required_world_updates: ["INSTITUTIONS"] })
        }
      },
      {
        op: "create_sec_record" as const,
        target_world: world,
        target_file: `_source/institutions/${secId}.yaml`,
        payload: {
          sec_record: section(secId, "INSTITUTIONS", cfId, "Trace register: law. Trace register: songs.")
        }
      }
    ]
  };
}

function genesisEnvelope() {
  return {
    plan_id: "spec09-genesis",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "create-base-world",
    expected_id_allocations: {},
    patches: [
      {
        op: "create_cf_record" as const,
        target_world: "seeded",
        target_file: "_source/canon/CF-1.yaml",
        payload: {
          cf_record: capabilityCf("CF-1", { required_world_updates: ["INSTITUTIONS"] })
        }
      },
      {
        op: "create_sec_record" as const,
        target_world: "seeded",
        target_file: "_source/institutions/SEC-INS-001.yaml",
        payload: {
          sec_record: section("SEC-INS-001", "INSTITUTIONS", "CF-1", "Trace register: law. Trace register: songs.")
        }
      },
      {
        op: "create_cf_record" as const,
        target_world: "seeded",
        target_file: "_source/canon/CF-2.yaml",
        payload: {
          cf_record: geographyCf("CF-2")
        }
      },
      {
        op: "create_sec_record" as const,
        target_world: "seeded",
        target_file: "_source/geography/SEC-GEO-001.yaml",
        payload: {
          sec_record: section("SEC-GEO-001", "GEOGRAPHY", "CF-2", "Trace register: maps. Trace register: landscape.")
        }
      }
    ]
  };
}

function capabilityCf(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...completeCf,
    id,
    type: "capability",
    notes: "Rule 11 leverage: locality, secrecy, legitimacy",
    epistemic_profile: {
      directly_observable_by: ["trained witnesses"],
      inferable_by: ["auditors"],
      recorded_by: ["guild ledgers"],
      suppressed_by: ["monopolists"],
      distortion_vectors: ["rumor"],
      propagation_channels: ["formal reports"],
      evidence_left: ["marked tools"],
      knowledge_exclusions: ["outsiders"]
    },
    exception_governance: {
      activation_conditions: ["training required"],
      rate_limits: ["once per season"],
      mobility_limits: ["local only"],
      diffusion_barriers: ["guild guarded"],
      countermeasures: ["permit denial"],
      nondeployment_reasons: ["public legitimacy cost"]
    },
    ...overrides
  };
}

function geographyCf(id: string) {
  return {
    ...completeCf,
    id,
    type: "geography",
    domains_affected: ["geography"],
    required_world_updates: ["GEOGRAPHY"],
    epistemic_profile: {
      n_a: "Pure geography fact; no knowability axis."
    },
    exception_governance: {
      n_a: "Geography fact; no exception axis."
    },
    notes: "None"
  };
}

function section(id: string, fileClass: string, cfId: string, body: string) {
  return {
    ...validSection,
    id,
    file_class: fileClass,
    touched_by_cf: [cfId],
    body
  };
}

function createEmptyWorldIndex(worldSlug: string): void {
  const indexDir = path.join(tempRoot, "worlds", worldSlug, "_index");
  mkdirSync(indexDir, { recursive: true });
  const db = new Database(path.join(indexDir, "world.db"));
  try {
    const migrations = path.join(packageRoot, "..", "world-index", "src", "schema", "migrations");
    db.exec(readFileSync(path.join(migrations, "001_initial.sql"), "utf8"));
    db.exec(readFileSync(path.join(migrations, "002_scoped_references.sql"), "utf8"));
  } finally {
    db.close();
  }
}
