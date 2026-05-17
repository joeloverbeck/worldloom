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
        target_file: "_source/canon/CF-1.yaml",
        payload: {
          cf_record: {
            ...completeCf,
            id: "CF-1",
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
          sec_record: { ...validSection, id: "SEC-INS-001", touched_by_cf: ["CF-1"] }
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
    const choiceSetExecution = result.executions.find(
      (execution) => execution.name === "choice_set_noncollapse"
    );
    assert.equal(choiceSetExecution?.status, "skipped");
    const chcDaExecution = result.executions.find(
      (execution) => execution.name === "chc_grounded_in_artifact_accessible"
    );
    assert.equal(chcDaExecution?.status, "skipped");
    const proseArtifactExecution = result.executions.find(
      (execution) => execution.name === "prose_load_bearing_artifact_mention"
    );
    assert.equal(proseArtifactExecution?.status, "skipped");
    const storyDaDuplicateExecution = result.executions.find(
      (execution) => execution.name === "story_da_duplicate_heuristic"
    );
    assert.equal(storyDaDuplicateExecution?.status, "skipped");
    assert.ok(!result.executions.some((execution) => execution.name === "arc_envelope_conformance"));
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
    const auditOnlyExecution = result.executions.find(
      (execution) => execution.name === "audit_only_se_shape"
    );
    assert.equal(auditOnlyExecution?.status, "skipped");
    const causalDependencyExecution = result.executions.find(
      (execution) => execution.name === "causal_dependency_threat_scan"
    );
    assert.equal(causalDependencyExecution?.status, "skipped");
    const expectedWitnessExecution = result.executions.find(
      (execution) => execution.name === "expected_witness_coverage"
    );
    assert.equal(expectedWitnessExecution?.status, "skipped");
    const sltCreatedAtPageExecution = result.executions.find(
      (execution) => execution.name === "slt_created_at_page_origin_consistency"
    );
    assert.equal(sltCreatedAtPageExecution?.status, "skipped");
    const canonDriftEvidenceExecution = result.executions.find(
      (execution) => execution.name === "canon_drift_classification_evidence"
    );
    assert.equal(canonDriftEvidenceExecution?.status, "skipped");
    const canonBaselineDriftExecution = result.executions.find(
      (execution) => execution.name === "canon_baseline_drift"
    );
    assert.equal(canonBaselineDriftExecution?.status, "skipped");
    const nonPropagationExecution = result.executions.find(
      (execution) => execution.name === "non_propagation_tag_shape"
    );
    assert.equal(nonPropagationExecution?.status, "skipped");
    const proposalPackageExecution = result.executions.find(
      (execution) => execution.name === "proposal_package_shape"
    );
    assert.equal(proposalPackageExecution?.status, "skipped");
    const proseReceiptExecution = result.executions.find(
      (execution) => execution.name === "prose_receipt_schema_compliance"
    );
    assert.equal(proseReceiptExecution?.status, "skipped");
    const validationTraceExecution = result.executions.find(
      (execution) => execution.name === "validation_trace_shape_compliance"
    );
    assert.equal(validationTraceExecution?.status, "skipped");
    const branchIsolationExecution = result.executions.find(
      (execution) => execution.name === "branch_isolation"
    );
    assert.equal(branchIsolationExecution?.status, "skipped");
    const observerFirewallExecution = result.executions.find(
      (execution) => execution.name === "observer_firewall"
    );
    assert.equal(observerFirewallExecution?.status, "skipped");
    const liePromotedSilentlyExecution = result.executions.find(
      (execution) => execution.name === "lie_promoted_silently"
    );
    assert.equal(liePromotedSilentlyExecution?.status, "skipped");
    const clockExecutions = result.executions.filter((execution) => execution.name.startsWith("clock_"));
    assert.equal(clockExecutions.length, 5);
    assert.ok(clockExecutions.every((execution) => execution.status === "skipped"));
    const secretExecutions = result.executions.filter((execution) => execution.name.startsWith("secret_") || execution.name === "critical_secret_clue_coverage_when_revealed");
    assert.equal(secretExecutions.length, 3);
    assert.ok(secretExecutions.every((execution) => execution.status === "skipped"));

    for (const execution of result.executions.filter(
      (row) =>
        row !== storyletExecution &&
        row !== choiceSetExecution &&
        row !== chcDaExecution &&
        row !== proseArtifactExecution &&
        row !== storyDaDuplicateExecution &&
        row !== snapshotReplayExecution &&
        row !== recursiveClosureExecution &&
        row !== snapshotIntegrityExecution &&
        row !== auditOnlyExecution &&
        row !== causalDependencyExecution &&
        row !== sltCreatedAtPageExecution &&
        row !== canonDriftEvidenceExecution &&
        row !== canonBaselineDriftExecution &&
        row !== expectedWitnessExecution &&
        row !== nonPropagationExecution &&
        row !== proposalPackageExecution &&
        row !== proseReceiptExecution &&
        row !== validationTraceExecution &&
        row !== branchIsolationExecution &&
        row !== observerFirewallExecution &&
        row !== liePromotedSilentlyExecution &&
        !clockExecutions.includes(row) &&
        !secretExecutions.includes(row)
    )) {
      assert.equal(execution.status, "pass");
      assert.equal(typeof execution.name, "string");
      assert.ok(execution.duration_ms >= 0);
    }
  });
});

test("validatePatchPlan runs CLK validators over same-envelope pressure clock records", async () => {
  await withTempRoot(async () => {
    const result = await validatePatchPlan({
      plan_id: "clk-plan-001",
      target_world: "seeded",
      approval_token: "token-from-gate",
      verdict: "ACCEPT",
      originating_skill: "branching-story-turn-cycle",
      expected_id_allocations: {},
      patches: [
        {
          op: "create_clk_record",
          target_world: "seeded",
          target_file: "stories/marla/_source/clocks/CLK-1.yaml",
          payload: {
            story_slug: "marla",
            record: {
              id: "CLK-1",
              story_id: "STORY-1",
              created_at_page: "PG-1",
              supersedes: null,
              title: "Exposure clock",
              clock_kind: "exposure",
              driver: "system",
              linked_records: [],
              value: 7,
              max: 6,
              salience: "high",
              visibility: "hidden",
              thresholds: [{ at: 2, label: "noticed", effects: { create: [], supersede: [], close: [] } }],
              tick_history: [],
              status: "active",
              resolution_event: null
            }
          }
        }
      ]
    } as unknown as PatchPlanEnvelope);

    assert.ok(result.executions.some((execution) => execution.name === "clock_value_in_range" && execution.status === "fail"));
    assert.ok(result.verdicts.some((verdict) => verdict.code === "clock_value_in_range.out_of_range"));
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
          verdict.location.node_id === "CF-1" &&
          verdict.code === "record_schema_compliance.const"
      )
    );
  });
});

test("validatePatchPlan applies current CF safety blocks only to changed pre-apply records", async () => {
  await withTempRoot(async () => {
    seedIndexedCf("CF-2", { ...completeCf, id: "CF-2", type: "capability" });

    const result = await validatePatchPlan(cleanPlan({
      type: "capability",
      epistemic_profile: { directly_observable_by: ["auditors"] },
      exception_governance: { activation_conditions: ["test condition"] }
    }) as unknown as PatchPlanEnvelope);

    assert.ok(!result.verdicts.some(
      (verdict) =>
        verdict.location.node_id === "CF-2" &&
        verdict.code.startsWith("record_schema_compliance.missing_")
    ));
    assert.ok(!result.verdicts.some(
      (verdict) =>
        verdict.location.node_id === "CF-1" &&
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
      id: "SLT-1",
      story_id: "STORY-1",
      preconditions: {
        hard: [{ pred: "unknown_predicate", op: "==", value: true }]
      }
    });

    const result = await validatePatchPlan(plan as unknown as PatchPlanEnvelope);
    const execution = result.executions.find(
      (row) => row.name === "storylet_predicate_dsl_parsability"
    );

    assert.equal(execution?.status, "fail");
    assert.ok(result.verdicts.some((verdict) => verdict.code === "predicate.unknown_pred"));
  });
});

test("validatePatchPlan resolves same-envelope CNSQ references for storylet predicate parsing", async () => {
  await withTempRoot(async () => {
    const storylet = completeStoryletRecord();
    storylet.preconditions = {
      hard: [{ pred: "record_active", record: "CNSQ-1" }],
      soft: []
    };
    const plan = storyletPlan(storylet) as unknown as { patches: unknown[] };
    plan.patches.unshift(storyPatch("create_cnsq_record", "consequences", {
      id: "CNSQ-1",
      story_id: "STORY-1",
      created_at_page: "PG-1"
    }));

    const result = await validatePatchPlan(plan as unknown as PatchPlanEnvelope);

    const execution = result.executions.find(
      (row) => row.name === "storylet_predicate_dsl_parsability"
    );
    assert.notEqual(execution?.status, "fail");
    assert.ok(!result.verdicts.some(
      (verdict) =>
        verdict.validator === "storylet_predicate_dsl_parsability" &&
        verdict.code === "predicate.unresolved_reference" &&
        verdict.message.includes("CNSQ-1")
    ));
  });
});

test("validatePatchPlan rejects missing CNSQ references for storylet predicate parsing", async () => {
  await withTempRoot(async () => {
    const storylet = completeStoryletRecord();
    storylet.preconditions = {
      hard: [{ pred: "record_active", record: "CNSQ-99" }],
      soft: []
    };

    const result = await validatePatchPlan(storyletPlan(storylet) as unknown as PatchPlanEnvelope);

    assert.ok(result.verdicts.some(
      (verdict) =>
        verdict.validator === "storylet_predicate_dsl_parsability" &&
        verdict.code === "predicate.unresolved_reference" &&
        verdict.message.includes("CNSQ-99")
    ));
  });
});

test("validatePatchPlan applies story-bundle record schemas to Shape B story ops", async () => {
  await withTempRoot(async () => {
    const plan = storyletPlan({
      id: "SLT-1",
      preconditions: {
        hard: []
      }
    });

    const result = await validatePatchPlan(plan as unknown as PatchPlanEnvelope);

    assert.ok(result.verdicts.some(
      (verdict) =>
        verdict.validator === "record_schema_compliance" &&
        verdict.location.file === "stories/marla-kern-seduction/_source/storylets/SLT-1.yaml" &&
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

test("validatePatchPlan accepts pending page-cycle pages after prose-state validators were retired", async () => {
  await withTempRoot(async () => {
    const result = await validatePatchPlan(pendingProsePagePlan() as unknown as PatchPlanEnvelope);

    for (const name of [
      "snapshot_replay_equality"
    ]) {
      const execution = result.executions.find((row) => row.name === name);
      assert.equal(execution?.status, "pass", name);
      assert.ok(!result.verdicts.some((verdict) => verdict.validator === name), name);
    }
  });
});

test("validatePatchPlan rejects Shape B storylet ops missing schema-required fields", async () => {
  await withTempRoot(async () => {
    const missingMysteryPolicy = completeStoryletRecord();
    delete missingMysteryPolicy.mystery_policy;

    const result = await validatePatchPlan(storyletPlan(missingMysteryPolicy) as unknown as PatchPlanEnvelope);

    assert.ok(result.verdicts.some(
      (verdict) =>
        verdict.validator === "record_schema_compliance" &&
        verdict.location.file === "stories/marla-kern-seduction/_source/storylets/SLT-1.yaml" &&
        verdict.message.includes("mystery_policy")
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
        verdict.message.includes("SE-9")
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
      slt_ids: [String(record.id ?? "SLT-1")]
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
        ...validPageFields("PG-2"),
        id: "PG-2",
        story_id: "STORY-1",
        branch_path: ["PG-1", "PG-2"],
        state_snapshot: { objective_facts: ["SF-1"] }
      }),
      storyPatch("create_sf_record", "facts", {
        id: "SF-1",
        story_id: "STORY-1",
        created_at_page: "PG-2",
        statement: "The branch-local fact reaches a future event.",
        authority: "branch_local",
        evidence: [{ event_id: "SE-9" }]
      }),
      storyPatch("create_se_record", "events", {
        id: "SE-9",
        story_id: "STORY-1",
        event_kind: "selected_choice",
        created_at_page: "PG-99",
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
        ...validPageFields("PG-2"),
        id: "PG-2",
        story_id: "STORY-1",
        branch_path: ["PG-1", "PG-2"],
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
        id: "STLOC-1",
        story_id: "STORY-1",
        created_at_page: "PG-2"
      }),
      storyPatch("create_slt_record", "storylets", completeStoryletRecord()),
      storyPatch("create_se_record", "events", {
        id: "SE-2",
        story_id: "STORY-1",
        event_kind: "selected_choice",
        created_at_page: "PG-2",
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
        ...validPageFields("PG-2"),
        id: "PG-2",
        story_id: "STORY-1",
        branch_path: ["PG-2"],
        applied_event_ops: ["SE-2"],
        state_snapshot: {
          ...completeStateSnapshot(),
          canon_revision: null,
          current_location: "STLOC-1",
          applied_effect_variant: "partial-repair"
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
  return plan;
}

function pendingChildAfterRenderedParentPlan() {
  const plan = replaySafePagePlan();
  const eventPatch = plan.patches.find((patch) => patch.op === "create_se_record");
  const event = eventPatch?.payload.record as Record<string, unknown>;
  event.id = "SE-3";
  event.created_at_page = "PG-3";

  const pagePatch = plan.patches.find((patch) => patch.op === "create_pg_record");
  if (pagePatch === undefined) {
    throw new Error("replaySafePagePlan fixture must include a create_pg_record patch");
  }
  pagePatch.target_file = "stories/marla-kern-seduction/_source/pages/PG-3.yaml";
  const page = pagePatch.payload.record as Record<string, unknown>;
  const stateSnapshot = page.state_snapshot as Record<string, unknown>;
  page.id = "PG-3";
  Object.assign(page, validPageFields("PG-3"));
  page.branch_path = ["PG-1", "PG-2", "PG-3"];
  page.applied_event_ops = ["SE-3"];
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

function validPageFields(id: string): Record<string, unknown> {
  return {
    prose_plan_path: `pages-prose-plans/${id}.md`,
    plan: {
      path: `pages-prose-plans/${id}.md`,
      plan_hash: "0000000000000000000000000000000000000000000000000000000000000001"
    },
    state_hash: "0000000000000000000000000000000000000000000000000000000000000002",
    validation_trace: {
      input_legality: "PASS: resolved event and input are lawful.",
      parent_snapshot_compatibility: "PASS: parent state hash matches.",
      mystery_invariant_firewall: "PASS: no forbidden mystery is resolved.",
      branch_isolation: "PASS: active records are branch visible.",
      append_only_delta: "PASS: deltas create, supersede, or close records.",
      consequence_or_terminal: "PASS: consequence capacity is present.",
      plan_grounding: "PASS: plan is grounded in loaded state.",
      canon_promotion_hold: "NOT_APPLICABLE: no promotion claim is present."
    }
  };
}

function completeStoryletRecord(): Record<string, unknown> {
  return {
    id: "SLT-1",
    story_id: "STORY-1",
    scope: {
      visibility: "global_author_pool",
      branch_id: null
    },
    created_at_page: null,
    title: "Complete commitment block",
    move_family: "protection",
    preconditions: {
      hard: [],
      soft: []
    },
    beats: [
      {
        beat_id: "B1",
        function: "setup",
        instruction: "Establish the damaged gate and Mara's boundary."
      },
      {
        beat_id: "B2",
        function: "action",
        instruction: "Offer practical help without forcing disclosure."
      },
      {
        beat_id: "B3",
        function: "exit",
        instruction: "Close on the next concrete commitment."
      }
    ],
    effects: {
      create: [],
      supersede: [],
      close: []
    },
    exit_options: [
      {
        action_family: "communicate",
        surface_hint: "Ask one bounded follow-up question.",
        likely_effects: ["OBL-1"]
      }
    ],
    saliency: {
      urgency: "medium",
      cooldown_pages: 0,
      tags: ["gate-repair"]
    },
    mystery_policy: {
      forbidden_resolutions: [],
      allowed_authority: "apparent"
    },
    provenance: {
      origin: "manual_authoring"
    }
  };
}

function completeStateSnapshot(): Record<string, unknown> {
  return {
    canon_revision: "CH-1",
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
    current_location: "STLOC-1",
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
