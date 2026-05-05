import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";
import yaml from "js-yaml";
import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { validatePatchPlan } from "../../src/public/index.js";
import { completeCf } from "../rules/helpers.js";
import { validSection } from "../structural/helpers.js";

const FIXTURE_ROOT = path.resolve(process.cwd(), "tests", "fixtures");

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
    const storyletExecution = result.executions.find(
      (execution) => execution.name === "storylet_predicate_dsl_parsability"
    );
    assert.equal(storyletExecution?.status, "skipped");
    const snapshotReplayExecution = result.executions.find(
      (execution) => execution.name === "snapshot_replay_equality"
    );
    assert.equal(snapshotReplayExecution?.status, "skipped");
    const recursiveClosureExecution = result.executions.find(
      (execution) => execution.name === "recursive_reference_closure"
    );
    assert.equal(recursiveClosureExecution?.status, "skipped");

    for (const execution of result.executions.filter(
      (row) => row !== storyletExecution && row !== snapshotReplayExecution && row !== recursiveClosureExecution
    )) {
      assert.equal(execution.status, "pass");
      assert.equal(typeof execution.name, "string");
      assert.ok(execution.duration_ms >= 0);
    }
  });
});

test("validatePatchPlan accepts matching retrieval record_kind and rejects mismatches", async () => {
  await withTempRoot(async () => {
    const accepted = await validatePatchPlan(
      cleanPlan({ record_kind: "canon_fact" }) as unknown as PatchPlanEnvelope
    );
    assert.deepEqual(accepted.verdicts, []);

    const rejected = await validatePatchPlan(
      cleanPlan({ record_kind: "change_log" }) as unknown as PatchPlanEnvelope
    );
    assert.ok(
      rejected.verdicts.some(
        (verdict) =>
          verdict.validator === "record_schema_compliance" &&
          verdict.location.node_id === "CF-0001" &&
          verdict.code === "record_schema_compliance.const"
      )
    );
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

test("validatePatchPlan skips storylet predicate parsing until story-bundle ops exist", async () => {
  await withTempRoot(async () => {
    const result = await validatePatchPlan(cleanPlan() as unknown as PatchPlanEnvelope);
    const execution = result.executions.find(
      (row) => row.name === "storylet_predicate_dsl_parsability"
    );

    assert.equal(execution?.status, "skipped");
    assert.equal(execution?.detail, "applies_to=false");
  });
});

test("validatePatchPlan runs storylet predicate parsing for Shape B storylet ops", async () => {
  await withTempRoot(async () => {
    const plan = storyletPlan({
      id: "SLT-0001",
      story_id: "STORY-001",
      hard_preconds: [{ pred: "unknown_predicate", op: "==", value: true }]
    });

    const result = await validatePatchPlan(plan as unknown as PatchPlanEnvelope);
    const execution = result.executions.find(
      (row) => row.name === "storylet_predicate_dsl_parsability"
    );

    assert.equal(execution?.status, "fail");
    assert.ok(result.verdicts.some((verdict) => verdict.code === "predicate.unknown_pred"));
  });
});

test("validatePatchPlan applies story-bundle record schemas to Shape B story ops", async () => {
  await withTempRoot(async () => {
    const plan = storyletPlan({
      id: "SLT-0001",
      hard_preconds: []
    });

    const result = await validatePatchPlan(plan as unknown as PatchPlanEnvelope);

    assert.ok(result.verdicts.some(
      (verdict) =>
        verdict.validator === "record_schema_compliance" &&
        verdict.location.file === "stories/marla-kern-seduction/_source/storylets/SLT-0001.yaml" &&
        verdict.code === "record_schema_compliance.required"
    ));
  });
});

test("validatePatchPlan accepts complete storylet records in Shape B story ops", async () => {
  await withTempRoot(async () => {
    const result = await validatePatchPlan(storyletPlan(completeStoryletRecord()) as unknown as PatchPlanEnvelope);

    assert.ok(result.executions.some((row) => row.name === "record_schema_compliance" && row.status === "pass"));
    assert.ok(!result.verdicts.some((verdict) => verdict.validator === "record_schema_compliance"));
  });
});

test("validatePatchPlan rejects Shape B storylet ops missing schema-required fields", async () => {
  await withTempRoot(async () => {
    const missingMysterySafety = completeStoryletRecord();
    delete missingMysterySafety.mystery_safety;

    const result = await validatePatchPlan(storyletPlan(missingMysterySafety) as unknown as PatchPlanEnvelope);

    assert.ok(result.verdicts.some(
      (verdict) =>
        verdict.validator === "record_schema_compliance" &&
        verdict.location.file === "stories/marla-kern-seduction/_source/storylets/SLT-0001.yaml" &&
        verdict.message.includes("mystery_safety")
    ));
  });
});

test("validatePatchPlan runs recursive reference closure for Shape B page ops", async () => {
  await withTempRoot(async () => {
    const result = await validatePatchPlan(pagePlanWithBranchLeak() as unknown as PatchPlanEnvelope);

    const execution = result.executions.find((row) => row.name === "recursive_reference_closure");
    assert.equal(execution?.status, "fail");
    assert.ok(result.verdicts.some(
      (verdict) =>
        verdict.validator === "recursive_reference_closure" &&
        verdict.code === "recursive_reference_closure.branch_leak" &&
        verdict.message.includes("SE-0009")
    ));
  });
});

function storyletPlan(record: Record<string, unknown>) {
  return {
    plan_id: "plan-story-001",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "storylet-pool-authoring",
    expected_id_allocations: {
      slt_ids: [String(record.id ?? "SLT-0001")]
    },
    patches: [
      {
        op: "create_slt_record" as const,
        target_world: "seeded",
        payload: {
          story_slug: "marla-kern-seduction",
          record
        }
      }
    ]
  };
}

function pagePlanWithBranchLeak() {
  return {
    plan_id: "plan-page-001",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "branching-story-page-cycle",
    expected_id_allocations: {},
    patches: [
      storyPatch("create_pg_record", "pages", {
        id: "PG-0002",
        story_id: "STORY-001",
        branch_path: ["PG-0001", "PG-0002"],
        state_snapshot: { objective_facts: ["SF-0001"] }
      }),
      storyPatch("create_sf_record", "facts", {
        id: "SF-0001",
        story_id: "STORY-001",
        created_at_page: "PG-0002",
        evidence: [{ event_id: "SE-0009" }]
      }),
      storyPatch("create_se_record", "events", {
        id: "SE-0009",
        story_id: "STORY-001",
        created_at_page: "PG-0099",
        ops: []
      })
    ]
  };
}

function storyPatch(op: string, sourceDir: string, record: Record<string, unknown>) {
  return {
    op,
    target_world: "seeded",
    target_file: `stories/marla-kern-seduction/_source/${sourceDir}/${record.id}.yaml`,
    payload: {
      story_slug: "marla-kern-seduction",
      record
    }
  };
}

function completeStoryletRecord(): Record<string, unknown> {
  return yaml.load(
    readFileSync(path.join(FIXTURE_ROOT, "story-storylet-complete.yaml"), "utf8"),
    { schema: yaml.JSON_SCHEMA }
  ) as Record<string, unknown>;
}

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
