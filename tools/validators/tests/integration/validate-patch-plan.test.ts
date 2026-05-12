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
    db.exec(readFileSync(path.join(migrations, "004_story_bundle_scope.sql"), "utf8"));
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
    const arcSchemaExecution = result.executions.find(
      (execution) => execution.name === "arc_schema_compliance"
    );
    assert.equal(arcSchemaExecution?.status, "skipped");
    const choiceWorthinessExecution = result.executions.find(
      (execution) => execution.name === "choice_worthiness_completeness"
    );
    assert.equal(choiceWorthinessExecution?.status, "skipped");
    const stopPolicyExecution = result.executions.find(
      (execution) => execution.name === "stop_policy_parsability"
    );
    assert.equal(stopPolicyExecution?.status, "skipped");
    const effectModelLegalityExecution = result.executions.find(
      (execution) => execution.name === "effect_model_legality"
    );
    assert.equal(effectModelLegalityExecution?.status, "skipped");
    const effectModelReplaySafetyExecution = result.executions.find(
      (execution) => execution.name === "effect_model_replay_safety"
    );
    assert.equal(effectModelReplaySafetyExecution?.status, "skipped");
    const arcTraceEvidenceExecution = result.executions.find(
      (execution) => execution.name === "arc_trace_evidence_alignment"
    );
    assert.equal(arcTraceEvidenceExecution?.status, "skipped");
    const narrativePointExecution = result.executions.find(
      (execution) => execution.name === "narrative_point_classification"
    );
    assert.equal(narrativePointExecution?.status, "skipped");
    const arcEnvelopeExecution = result.executions.find(
      (execution) => execution.name === "arc_envelope_conformance"
    );
    assert.equal(arcEnvelopeExecution?.status, "skipped");
    const snapshotReplayExecution = result.executions.find(
      (execution) => execution.name === "snapshot_replay_equality"
    );
    assert.equal(snapshotReplayExecution?.status, "skipped");
    const recursiveClosureExecution = result.executions.find(
      (execution) => execution.name === "recursive_reference_closure"
    );
    assert.equal(recursiveClosureExecution?.status, "skipped");
    const snapshotIntegrityExecution = result.executions.find(
      (execution) => execution.name === "state_snapshot_integrity"
    );
    assert.equal(snapshotIntegrityExecution?.status, "skipped");

    for (const execution of result.executions.filter(
      (row) =>
        row !== storyletExecution &&
        row !== arcSchemaExecution &&
        row !== choiceWorthinessExecution &&
        row !== stopPolicyExecution &&
        row !== effectModelLegalityExecution &&
        row !== effectModelReplaySafetyExecution &&
        row !== arcTraceEvidenceExecution &&
        row !== narrativePointExecution &&
        row !== arcEnvelopeExecution &&
        row !== snapshotReplayExecution &&
        row !== recursiveClosureExecution &&
        row !== snapshotIntegrityExecution
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
    assert.ok(result.executions.some((row) => row.name === "effect_model_legality" && row.status === "pass"));
    assert.ok(!result.verdicts.some((verdict) => verdict.validator === "record_schema_compliance"));
    assert.ok(!result.verdicts.some((verdict) => verdict.validator === "effect_model_legality"));
  });
});

test("validatePatchPlan runs effect-model replay safety for Shape B page ops", async () => {
  await withTempRoot(async () => {
    const result = await validatePatchPlan(replaySafePagePlan() as unknown as PatchPlanEnvelope);

    const execution = result.executions.find((row) => row.name === "effect_model_replay_safety");
    assert.equal(execution?.status, "pass");
    assert.ok(!result.verdicts.some((verdict) => verdict.validator === "effect_model_replay_safety"));
  });
});

test("validatePatchPlan accepts pending page-cycle pages before ARC_TRACE finalization", async () => {
  await withTempRoot(async () => {
    const result = await validatePatchPlan(pendingProsePagePlan() as unknown as PatchPlanEnvelope);

    for (const name of [
      "effect_model_replay_safety",
      "narrative_point_classification",
      "snapshot_replay_equality"
    ]) {
      const execution = result.executions.find((row) => row.name === name);
      assert.equal(execution?.status, "pass", name);
      assert.ok(!result.verdicts.some((verdict) => verdict.validator === name), name);
    }
  });
});

test("validatePatchPlan materializes ARC_TRACE records for pre-apply trace validators", async () => {
  await withTempRoot(async () => {
    const proseDir = path.resolve(process.cwd(), "../../worlds/seeded/stories/marla-kern-seduction/pages-prose");
    mkdirSync(proseDir, { recursive: true });
    writeFileSync(path.join(proseDir, "PG-0002.md"), "Mara offers repair help and Mara accepts.", "utf8");

    const result = await validatePatchPlan(arcTracePlan() as unknown as PatchPlanEnvelope);

    for (const name of [
      "arc_trace_evidence_alignment",
      "narrative_point_classification",
      "arc_envelope_conformance"
    ]) {
      const execution = result.executions.find((row) => row.name === name);
      assert.equal(execution?.status, "pass", name);
      assert.ok(!result.verdicts.some((verdict) => verdict.validator === name), name);
    }
  });
});

test("validatePatchPlan finds indexed ARC_TRACE rows for rendered parent pages", async () => {
  await withTempRoot(async () => {
    seedIndexedStoryRecord("PG-0002", "page_record", "pages", renderedParentPage());
    seedIndexedStoryRecord("ARCTRACE-0001", "arc_trace_node", "arc-traces", existingArcTrace());

    const result = await validatePatchPlan(pendingChildAfterRenderedParentPlan() as unknown as PatchPlanEnvelope);

    const narrativeExecution = result.executions.find(
      (row) => row.name === "narrative_point_classification"
    );
    assert.equal(narrativeExecution?.status, "pass");
    assert.ok(!result.verdicts.some(
      (verdict) =>
        verdict.validator === "narrative_point_classification" &&
        verdict.code === "narrative_point_classification.missing_arc_trace" &&
        verdict.location.node_id === "marla-kern-seduction:PG-0002"
    ));
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

test("validatePatchPlan runs state snapshot integrity for Shape B page ops", async () => {
  await withTempRoot(async () => {
    const result = await validatePatchPlan(pagePlanWithDanglingSnapshotReference() as unknown as PatchPlanEnvelope);

    const execution = result.executions.find((row) => row.name === "state_snapshot_integrity");
    assert.equal(execution?.status, "fail");
    assert.ok(result.verdicts.some(
      (verdict) =>
        verdict.validator === "state_snapshot_integrity" &&
        verdict.code === "state_snapshot_integrity.dangling_reference" &&
        verdict.message.includes("SF-9999")
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

function pagePlanWithDanglingSnapshotReference() {
  return {
    plan_id: "plan-page-integrity-001",
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
        state_snapshot: {
          ...completeStateSnapshot(),
          objective_facts: ["SF-9999"]
        }
      })
    ]
  };
}

function replaySafePagePlan() {
  return {
    plan_id: "plan-replay-safe-001",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "branching-story-page-cycle",
    expected_id_allocations: {},
    patches: [
      storyPatch("create_stloc_record", "locations", {
        id: "STLOC-0001",
        story_id: "STORY-001",
        created_at_page: "PG-0002"
      }),
      storyPatch("create_slt_record", "storylets", completeStoryletRecord()),
      storyPatch("create_se_record", "events", {
        id: "SE-0002",
        story_id: "STORY-001",
        created_at_page: "PG-0002",
        ops: [
          {
            op_id: "OP-0001",
            op_type: "relationship_supersede",
            input_records: [],
            output_records: [],
            deterministic_payload: {}
          }
        ]
      }),
      storyPatch("create_pg_record", "pages", {
        id: "PG-0002",
        story_id: "STORY-001",
        branch_path: ["PG-0002"],
        storylet_realized: "SLT-0001",
        applied_event_ops: ["SE-0002"],
        state_snapshot: {
          ...completeStateSnapshot(),
          canon_revision: null,
          current_location: "STLOC-0001",
          applied_effect_variant: "partial-repair",
          narrative_point_classification: "CONTINUE_ARC"
        }
      })
    ]
  };
}

function arcTracePlan() {
  return {
    plan_id: "plan-arc-trace-001",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "branching-story-page-cycle",
    expected_id_allocations: {},
    patches: [
      ...replaySafePagePlan().patches,
      storyPatch("create_arc_trace_record", "arc-traces", {
        id: "ARCTRACE-0001",
        story_id: "STORY-001",
        created_at_page: "PG-0002",
        arc_realized: "SLT-0001",
        effect_variant_applied: "partial-repair",
        realized_beats: [
          {
            beat_id: "B1",
            function: "offer-help",
            realized: "true",
            evidence_span: { start: 0, end: 14 }
          }
        ],
        observed_actions: [
          {
            actor: "STENT-0001",
            action: "offers repair help",
            target: "STENT-0002",
            evidence_span: { start: 0, end: 14 }
          }
        ],
        observed_claims: [],
        possible_violations: [],
        stop_condition_hit: {
          id: "help-accepted",
          category: "normal_exit",
          evidence_span: { start: 21, end: 31 }
        },
        effect_evidence: [
          {
            effect_ref: 0,
            realized: "true",
            evidence_span: { start: 21, end: 31 }
          }
        ],
        semantic_critic_verdict: {
          status: "pass",
          reasons: [],
          required_revision_constraints: []
        }
      })
    ]
  };
}

function pendingProsePagePlan() {
  const plan = replaySafePagePlan();
  const pagePatch = plan.patches.find((patch) => patch.op === "create_pg_record");
  const page = pagePatch?.payload.record as Record<string, unknown>;
  const stateSnapshot = page.state_snapshot as Record<string, unknown>;
  page.prose_status = "pending";
  stateSnapshot.arc_trace_emitted = false;
  stateSnapshot.arc_trace_id = null;
  stateSnapshot.narrative_point_classification = "NATURAL_COMMITMENT_HINGE";
  return plan;
}

function pendingChildAfterRenderedParentPlan() {
  const plan = replaySafePagePlan();
  const eventPatch = plan.patches.find((patch) => patch.op === "create_se_record");
  const event = eventPatch?.payload.record as Record<string, unknown>;
  event.id = "SE-0003";
  event.created_at_page = "PG-0003";

  const pagePatch = plan.patches.find((patch) => patch.op === "create_pg_record");
  if (pagePatch === undefined) {
    throw new Error("replaySafePagePlan fixture must include a create_pg_record patch");
  }
  pagePatch.target_file = "stories/marla-kern-seduction/_source/pages/PG-0003.yaml";
  const page = pagePatch.payload.record as Record<string, unknown>;
  const stateSnapshot = page.state_snapshot as Record<string, unknown>;
  page.id = "PG-0003";
  page.branch_path = ["PG-0001", "PG-0002", "PG-0003"];
  page.applied_event_ops = ["SE-0003"];
  page.prose_status = "pending";
  stateSnapshot.arc_trace_emitted = false;
  stateSnapshot.arc_trace_id = null;
  stateSnapshot.narrative_point_classification = "NATURAL_COMMITMENT_HINGE";
  return plan;
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

function renderedParentPage(): Record<string, unknown> {
  return {
    id: "PG-0002",
    story_id: "STORY-001",
    branch_path: ["PG-0001", "PG-0002"],
    storylet_realized: "SLT-0001",
    applied_event_ops: ["SE-0002"],
    prose_status: "rendered",
    state_snapshot: {
      ...completeStateSnapshot(),
      applied_effect_variant: "partial-repair",
      narrative_point_classification: "NATURAL_COMMITMENT_HINGE",
      arc_trace_emitted: true,
      arc_trace_id: "ARCTRACE-0001"
    }
  };
}

function existingArcTrace(): Record<string, unknown> {
  return {
    id: "ARCTRACE-0001",
    story_id: "STORY-001",
    created_at_page: "PG-0002",
    arc_realized: "SLT-0001",
    effect_variant_applied: "partial-repair",
    realized_beats: [],
    observed_actions: [],
    observed_claims: [],
    possible_violations: [],
    stop_condition_hit: {
      id: "help-accepted",
      category: "normal_exit",
      evidence_span: { start: 0, end: 12 }
    },
    effect_evidence: [],
    semantic_critic_verdict: {
      status: "pass",
      reasons: [],
      required_revision_constraints: []
    }
  };
}

function completeStoryletRecord(): Record<string, unknown> {
  return yaml.load(
    readFileSync(path.join(FIXTURE_ROOT, "story-storylet-complete.yaml"), "utf8"),
    { schema: yaml.JSON_SCHEMA }
  ) as Record<string, unknown>;
}

function completeStateSnapshot(): Record<string, unknown> {
  return {
    canon_revision: "CH-0001",
    objective_facts: [],
    apparent_facts: [],
    disputed_facts: [],
    reader_known_facts: [],
    belief_state_by_actor: {},
    rumor_state: [],
    obligations_open: [],
    obligations_paid_off: [],
    obligations_complicated: [],
    obligations_abandoned: [],
    consequences_pending: [],
    consequences_addressed: [],
    threads_active: [],
    relationships_current: [],
    intentions_current: [],
    cast_present: [],
    current_location: "STLOC-0001",
    accessible_locations: [],
    objects_in_scope: [],
    inventory_by_entity: {},
    entity_status: {}
  };
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

function seedIndexedStoryRecord(
  id: string,
  nodeType: string,
  sourceDir: string,
  parsed: Record<string, unknown>
): void {
  const storySlug = "marla-kern-seduction";
  const nodeId = `${storySlug}:${id}`;
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
        created_at_index_version,
        story_slug
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      nodeId,
      "seeded",
      `stories/${storySlug}/_source/${sourceDir}/${id}.yaml`,
      null,
      0,
      0,
      1,
      1,
      nodeType,
      yaml.dump(parsed),
      `hash-${nodeId}`,
      `anchor-${nodeId}`,
      null,
      1,
      storySlug
    );
  } finally {
    db.close();
  }
}
