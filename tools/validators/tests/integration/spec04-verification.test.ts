import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import Database from "better-sqlite3";
import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { buildReadSurface } from "../../src/cli/_helpers.js";
import { runValidators } from "../../src/framework/run.js";
import type { ValidatorRun } from "../../src/framework/types.js";
import { validatePatchPlan } from "../../src/public/index.js";
import { ruleValidators, structuralValidators } from "../../src/public/registry.js";
import { completeCf } from "../rules/helpers.js";
import { context, validSection } from "../structural/helpers.js";

const packageRoot = process.cwd();
const repoRoot = path.resolve(packageRoot, "../..");
const realAnimaliaRoot = path.join(repoRoot, "worlds", "animalia");

let tempRoot = "";
let tempWorldRoot = "";
let originalCwd = "";

before(() => {
  tempRoot = mkdtempSync(path.join(os.tmpdir(), "worldloom-spec04-"));
  tempWorldRoot = path.join(tempRoot, "worlds", "animalia");
  mkdirSync(path.dirname(tempWorldRoot), { recursive: true });
  cpSync(realAnimaliaRoot, tempWorldRoot, { recursive: true });
  mkdirSync(path.join(tempRoot, "tools", "validators"), { recursive: true });
  originalCwd = process.cwd();
  process.chdir(path.join(tempRoot, "tools", "validators"));
});

after(() => {
  process.chdir(originalCwd);
  rmSync(tempRoot, { recursive: true, force: true });
});

test("SPEC-04 capstone re-enumerates animalia source counts from the fixture copy", () => {
  assert.equal(countYaml("_source/canon"), 47);
  assert.equal(countYaml("_source/change-log"), 20);
  assert.equal(countMarkdown("adjudications"), 17);
});

test("SPEC-04 verification: Unit registry exposes the active mechanized validators", () => {
  assert.equal(structuralValidators.length, 6);
  assert.equal(ruleValidators.length, 6);
  assert.equal([...structuralValidators, ...ruleValidators].length, 12);
  assert.ok(!structuralValidators.some((validator) => validator.name === "adjudication_discovery_fields"));
});

test("SPEC-04 verification: Full-world baseline is clean after SPEC-14 grandfathering closure", async () => {
  const run = await runFullWorldValidation();

  assert.equal(run.summary.fail_count, 0);
  assert.equal(run.summary.warn_count, 0);
  assert.equal(run.summary.info_count, 0);
  assert.deepEqual(codesByValidator(run.verdicts), {});
});

test("SPEC-04 verification: Schema conformance has no atomic-source schema failures", async () => {
  const run = await runFullWorldValidation();
  const sourceSchemaFailures = run.verdicts.filter(
    (verdict) =>
      verdict.validator === "record_schema_compliance" &&
      verdict.location.file.startsWith("_source/")
  );

  assert.deepEqual(sourceSchemaFailures, []);
});

test("SPEC-04 verification: Pre-apply mode rejects a deliberate Rule 4 violation", async () => {
  const result = await validatePatchPlan(
    patchPlan({
      distribution: {
        who_can_do_it: ["office holders"],
        who_cannot_easily_do_it: ["outsiders"],
        why_not_universal: []
      }
    }) as unknown as PatchPlanEnvelope
  );

  assert.ok(
    result.verdicts.some(
      (verdict) =>
        verdict.location.node_id === "CF-9999" &&
        verdict.code === "rule4.missing_why_not_universal"
    )
  );
});

test("SPEC-04 verification: Engine rewire entry returns validator verdicts", async () => {
  const result = await validatePatchPlan(patchPlan() as unknown as PatchPlanEnvelope);

  assert.ok(Array.isArray(result.verdicts));
  assert.ok(!result.verdicts.some((verdict) => verdict.location.node_id === "CF-9999"));
});

test("SPEC-04 verification: Incremental mode filters to relevant validators", async () => {
  const run = await runValidators(
    [...structuralValidators, ...ruleValidators],
    {},
    context([], {
      run_mode: "incremental",
      world_slug: "animalia",
      touched_files: ["_source/canon/CF-0001.yaml"]
    })
  );

  assert.ok(run.summary.validators_run.includes("rule1_no_floating_facts"));
  assert.ok(run.summary.validators_run.includes("rule2_no_pure_cosmetics"));
  assert.ok(run.summary.validators_run.includes("rule4_no_globalization_by_accident"));
  assert.ok(run.summary.validators_run.includes("rule6_no_silent_retcons"));
  assert.ok(run.summary.validators_run.includes("touched_by_cf_completeness"));
  assert.ok(!run.summary.validators_run.includes("rule5_no_consequence_evasion"));
  assert.ok(!run.summary.validators_run.includes("rule7_mystery_reserve_preservation"));
  assert.ok(!run.summary.validators_run.includes("adjudication_discovery_fields"));
});

test("SPEC-04 verification: Phase 14a migration keeps Rule 3 skill-owned", () => {
  const ruleNames = ruleValidators.map((validator) => validator.name).sort();

  assert.deepEqual(ruleNames, [
    "rule1_no_floating_facts",
    "rule2_no_pure_cosmetics",
    "rule4_no_globalization_by_accident",
    "rule5_no_consequence_evasion",
    "rule6_no_silent_retcons",
    "rule7_mystery_reserve_preservation"
  ]);
  assert.ok(!ruleNames.includes("rule3_no_specialness_inflation"));
});

test("SPEC-04 verification: Full-world duration is logged as a dev-loop signal", async () => {
  const start = Date.now();
  const run = await runFullWorldValidation({ refresh: true });
  const durationMs = Date.now() - start;

  assert.equal(run.summary.fail_count, 0);
  assert.equal(run.summary.info_count, 0);
  console.log(`SPEC-04 full-world animalia validation took ${durationMs}ms`);
});

function countYaml(relativeDir: string): number {
  return readdirSync(path.join(tempWorldRoot, relativeDir)).filter((entry) => entry.endsWith(".yaml")).length;
}

function countMarkdown(relativeDir: string): number {
  return readdirSync(path.join(tempWorldRoot, relativeDir)).filter((entry) => entry.endsWith(".md")).length;
}

let cachedFullWorldRun: ValidatorRun | null = null;

async function runFullWorldValidation(options: { refresh?: boolean } = {}): Promise<ValidatorRun> {
  if (cachedFullWorldRun && !options.refresh) {
    return cachedFullWorldRun;
  }
  const db = new Database(path.join(tempWorldRoot, "_index", "world.db"));
  try {
    cachedFullWorldRun = await runValidators(
      [...structuralValidators, ...ruleValidators],
      { world_slug: "animalia", world_root: tempWorldRoot },
      {
        run_mode: "full-world",
        world_slug: "animalia",
        index: buildReadSurface(db, "animalia"),
        touched_files: []
      }
    );
    return cachedFullWorldRun;
  } finally {
    db.close();
  }
}

function codesByValidator(
  verdicts: Array<{ validator: string; code: string }>
): Record<string, string[]> {
  const grouped: Record<string, Set<string>> = {};
  for (const verdict of verdicts) {
    grouped[verdict.validator] ??= new Set<string>();
    grouped[verdict.validator]?.add(verdict.code);
  }
  const entries: Array<[string, string[]]> = Object.entries(grouped).map(([validator, codes]) => [
    validator,
    [...codes].sort()
  ]);
  entries.sort(([left], [right]) => left.localeCompare(right));
  return Object.fromEntries(entries);
}

function patchPlan(cfOverrides: Record<string, unknown> = {}) {
  return {
    plan_id: "spec04-capstone-plan",
    target_world: "animalia",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "canon-addition",
    expected_id_allocations: {},
    patches: [
      {
        op: "create_cf_record",
        target_world: "animalia",
        target_file: "_source/canon/CF-9999.yaml",
        payload: {
          cf_record: {
            ...completeCf,
            id: "CF-9999",
            required_world_updates: ["INSTITUTIONS"],
            ...cfOverrides
          }
        }
      },
      {
        op: "create_sec_record",
        target_world: "animalia",
        target_file: "_source/institutions/SEC-INS-999.yaml",
        payload: {
          sec_record: {
            ...validSection,
            id: "SEC-INS-999",
            touched_by_cf: ["CF-9999"]
          }
        }
      }
    ]
  };
}
