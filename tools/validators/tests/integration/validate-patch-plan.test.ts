import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";
import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { validatePatchPlan } from "../../src/public/index.js";
import { completeCf } from "../rules/helpers.js";
import { validSection } from "../structural/helpers.js";

function createTempRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "worldloom-validators-"));
  mkdirSync(path.join(root, "tools", "validators"), { recursive: true });
  mkdirSync(path.join(root, "worlds", "seeded", "_index"), { recursive: true });

  const db = new Database(path.join(root, "worlds", "seeded", "_index", "world.db"));
  try {
    const migrations = path.resolve(process.cwd(), "../world-index/src/schema/migrations");
    db.exec(readFileSync(path.join(migrations, "001_initial.sql"), "utf8"));
    db.exec(readFileSync(path.join(migrations, "002_scoped_references.sql"), "utf8"));
  } finally {
    db.close();
  }

  writeFileSync(path.join(root, "tools", "validators", "package.json"), "{}\n", "utf8");
  return root;
}

async function withTempRoot<T>(run: () => Promise<T>): Promise<T> {
  const root = createTempRoot();
  const originalCwd = process.cwd();
  process.chdir(path.join(root, "tools", "validators"));
  try {
    return await run();
  } finally {
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
}

function cleanPlan(overrides: Record<string, unknown> = {}) {
  return {
    plan_id: "plan-001",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "canon-addition",
    expected_id_allocations: {},
    patches: [
      {
        op: "create_cf_record" as const,
        target_world: "seeded",
        target_file: "_source/canon/CF-0001.yaml",
        payload: {
          cf_record: {
            ...completeCf,
            id: "CF-0001",
            required_world_updates: ["INSTITUTIONS"],
            ...overrides
          }
        }
      },
      {
        op: "create_sec_record" as const,
        target_world: "seeded",
        target_file: "_source/institutions/SEC-INS-001.yaml",
        payload: {
          sec_record: { ...validSection, id: "SEC-INS-001", touched_by_cf: ["CF-0001"] }
        }
      }
    ]
  };
}

test("validatePatchPlan returns no verdicts for a clean pre-apply plan", async () => {
  await withTempRoot(async () => {
    const result = await validatePatchPlan(cleanPlan() as unknown as PatchPlanEnvelope);

    assert.deepEqual(result.verdicts, []);
    assert.ok(Array.isArray(result.executions) && result.executions.length > 0);
    for (const execution of result.executions) {
      assert.equal(execution.status, "pass");
      assert.equal(typeof execution.name, "string");
      assert.ok(execution.duration_ms >= 0);
    }
  });
});

test("validatePatchPlan applies current CF safety blocks only to changed pre-apply records", async () => {
  await withTempRoot(async () => {
    seedIndexedCf("CF-0002", { ...completeCf, id: "CF-0002", type: "capability" });

    const result = await validatePatchPlan(cleanPlan({
      type: "capability",
      epistemic_profile: { directly_observable_by: ["auditors"] },
      exception_governance: { activation_conditions: ["test condition"] }
    }) as unknown as PatchPlanEnvelope);

    assert.ok(!result.verdicts.some(
      (verdict) =>
        verdict.location.node_id === "CF-0002" &&
        verdict.code.startsWith("record_schema_compliance.missing_")
    ));
    assert.ok(!result.verdicts.some(
      (verdict) =>
        verdict.location.node_id === "CF-0001" &&
        verdict.code.startsWith("record_schema_compliance.missing_")
    ));
  });
});

test("validatePatchPlan runs rule validators over materialized pre-apply records", async () => {
  await withTempRoot(async () => {
    const result = await validatePatchPlan(cleanPlan({ distribution: { why_not_universal: [] } }) as unknown as PatchPlanEnvelope);

    assert.ok(result.verdicts.some((verdict) => verdict.code === "rule4.missing_why_not_universal"));
  });
});

test("validatePatchPlan keeps the patch plan available for rule5", async () => {
  await withTempRoot(async () => {
    const plan = cleanPlan();
    plan.patches = plan.patches.slice(0, 1);

    const result = await validatePatchPlan(plan as unknown as PatchPlanEnvelope);

    assert.ok(result.verdicts.some((verdict) => verdict.code === "rule5.required_update_not_patched"));
  });
});

function seedIndexedCf(id: string, parsed: Record<string, unknown>): void {
  const dbPath = path.resolve(process.cwd(), "../../worlds/seeded/_index/world.db");
  const db = new Database(dbPath);
  try {
    db.prepare(
      `INSERT INTO nodes (
        node_id,
        world_slug,
        file_path,
        heading_path,
        byte_start,
        byte_end,
        line_start,
        line_end,
        node_type,
        body,
        content_hash,
        anchor_checksum,
        summary,
        created_at_index_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      "seeded",
      `_source/canon/${id}.yaml`,
      null,
      0,
      0,
      1,
      1,
      "canon_fact_record",
      JSON.stringify(parsed),
      `hash-${id}`,
      `anchor-${id}`,
      null,
      1
    );
  } finally {
    db.close();
  }
}
