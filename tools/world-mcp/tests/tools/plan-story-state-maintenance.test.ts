import assert from "node:assert/strict";
import test from "node:test";

import { ACTIVE_RECORDS_CLASSES } from "@worldloom/validators";

import { planStoryStateMaintenance } from "../../src/tools/plan-story-state-maintenance.js";
import { validatePatchPlan } from "../../src/tools/validate-patch-plan.js";
import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "./_shared.js";
import {
  buildStoryBundleWorld,
  STORY_FIXTURE_SLUG,
  STORY_FIXTURE_WORLD
} from "./story-bundle-fixture.js";

function maintenanceOperations() {
  return [
    {
      action: "create" as const,
      record_type: "relationship_record_story" as const,
      record: {
        story_id: "STORY-1",
        created_at_page: "PG-1",
        axis: "obligation",
        participants: ["STENT-2", "STENT-3"],
        direction: { kind: "bidirectional", from: null, to: null },
        value: "medium",
        valence: "symmetric",
        description: "Maintenance restamp: the watcher now has a visible obligation pressure with Marla.",
        derived_from: ["SE-1", "BEL-2"]
      }
    },
    {
      action: "create" as const,
      record_type: "story_plan_record" as const,
      record: {
        story_id: "STORY-1",
        created_at_page: "PG-1",
        created_by_event: "SE-1",
        holder: "STENT-2",
        root_intention: "STINT-1",
        objective: "Use the visible obligation pressure to reach the loft window without alerting the watcher.",
        plan_status: "active",
        belief_basis: ["BEL-2"],
        resource_basis: {
          facts: [],
          objects: ["STOBJ-1"],
          locations: ["STLOC-1"],
          artifacts: [],
          relationships: ["SREL-3"],
          obligations: []
        },
        blockers: ["THR-1"],
        current_step: {
          action_family: "evade",
          target_records: ["SREL-3", "STLOC-1"],
          success_condition: { predicates: [{ pred: "record_active", record: "SREL-3" }] }
        },
        fallback_steps: [],
        expires_when: "The watcher interrupts Marla or the loft window is reached.",
        derived_from: ["BEL-2", "SREL-3"]
      }
    },
    {
      action: "create" as const,
      record_type: "choice_record" as const,
      record: {
        story_id: "STORY-1",
        created_at_page: "PG-1",
        surface_label: "Use the obligation pressure",
        player_visible_intent: "Lean on the watcher obligation to keep Marla moving.",
        target_or_action_families: ["evade", "negotiate"],
        likely_state_pressure: "Turns the constraining affect into an explicit pressured choice.",
        grounded_in: { records: ["SREL-3", "STPLAN-2"] },
        success_policy: "Success keeps the watcher occupied long enough for Marla to move."
      }
    },
    {
      action: "supersede" as const,
      record_type: "story_emotion_record" as const,
      supersedes: "STEMO-1",
      record: {
        story_id: "STORY-1",
        created_at_page: "PG-1",
        created_by_event: "SE-1",
        holder: "STENT-2",
        status: "active",
        affect_kind: "anxiety",
        intensity: "high",
        orientation: { toward_records: ["THR-1", "SREL-3"] },
        appraisal_basis: ["BEL-2"],
        trigger_event: "SE-1",
        behavioral_pressure: ["conceal", "plan"],
        agency_effect: "constraining",
        expires_when: "The watcher is neutralized or Marla leaves the loft.",
        derived_from: ["BEL-2", "SREL-3", "STPLAN-2", "CHC-2"]
      }
    }
  ];
}

test("planStoryStateMaintenance returns a review-only patch plan for STEMO-style maintenance", async () => {
  const root = createTempRepoRoot();
  buildStoryBundleWorld(root);

  try {
    const result = await withRepoRoot(root, () =>
      planStoryStateMaintenance({
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        parent_page_id: "PG-1",
        reason: "Restamp constraining STEMO with downstream grounding.",
        source_ticket: "tickets/MCPENH-068.md",
        operations: maintenanceOperations()
      })
    );

    assert.ok(!("code" in result), JSON.stringify(result, null, 2));
    assert.equal(result.status, "planned");
    assert.equal(result.patch_plan.originating_skill, "plan_story_state_maintenance");
    assert.equal(result.patch_plan.approval_token, "PENDING_HARD_GATE_APPROVAL");
    assert.deepEqual(result.patch_plan.expected_id_allocations, {
      srel_ids: ["SREL-3"],
      stplan_ids: ["STPLAN-2"],
      chc_ids: ["CHC-2"],
      stemo_ids: ["STEMO-3"],
      se_ids: ["SE-2"],
      pg_ids: ["PG-2"]
    });
    assert.deepEqual(
      result.patch_plan.patches.map((patch) => patch.op),
      [
        "create_srel_record",
        "create_stplan_record",
        "create_chc_record",
        "create_stemo_record",
        "create_se_record",
        "create_pg_record"
      ]
    );
    assert.equal(result.patch_plan.patches[3]?.payload.record.id, "STEMO-3");
    assert.equal(result.patch_plan.patches[3]?.payload.record.supersedes, "STEMO-1");
    assert.equal(result.patch_plan.patches[0]?.payload.record.created_at_page, "PG-2");
    assert.equal(result.patch_plan.patches[1]?.payload.record.created_at_page, "PG-2");
    assert.equal(result.patch_plan.patches[1]?.payload.record.created_by_event, "SE-2");
    assert.equal(result.patch_plan.patches[3]?.payload.record.created_at_page, "PG-2");
    assert.equal(result.patch_plan.patches[3]?.payload.record.created_by_event, "SE-2");
    assert.equal(result.patch_plan.patches.at(-2)?.payload.record.id, "SE-2");
    assert.equal(result.patch_plan.patches.at(-2)?.payload.record.event_kind, "audit_repair");
    assert.deepEqual(result.patch_plan.patches.at(-2)?.payload.record.record_introductions, [
      {
        record_id: "SREL-3",
        class: "SREL",
        trigger: "trust_axis_becomes_relevant",
        evidence: ["SE-2"],
        distinct_from: [],
        rationale: "Restamp constraining STEMO with downstream grounding."
      },
      {
        record_id: "STPLAN-2",
        class: "STPLAN",
        trigger: "pressure_forces_plan",
        evidence: ["SE-2"],
        distinct_from: [],
        rationale: "Restamp constraining STEMO with downstream grounding."
      }
    ]);
    assert.deepEqual(result.patch_plan.patches.at(-2)?.payload.record.state_delta, {
      create: ["SREL-3", "STPLAN-2", "STEMO-3"],
      supersede: ["STEMO-1"],
      close: []
    });
    const page = result.patch_plan.patches.at(-1)?.payload.record;
    assert.equal(page?.id, "PG-2");
    assert.equal(page?.parent_page_id, "PG-1");
    assert.deepEqual((page?.state_snapshot as { active_records: Record<string, string[]> }).active_records.SREL, [
      "SREL-1",
      "SREL-2",
      "SREL-3"
    ]);
    assert.deepEqual((page?.state_snapshot as { active_records: Record<string, string[]> }).active_records.STEMO, [
      "STEMO-3"
    ]);
    assert.deepEqual(
      Object.keys((page?.state_snapshot as { active_records: Record<string, string[]> }).active_records),
      [...ACTIVE_RECORDS_CLASSES]
    );
    assert.deepEqual(page?.emitted_choices, []);
    assert.equal("maintenance_page_plan" in result, false);
    assert.equal("plan" in (page ?? {}), false);
    assert.equal("prose_plan_path" in (page ?? {}), false);
    assert.equal(result.affected_records[0]?.record_id, "STEMO-1");
    assert.ok(!("files_written" in result));
    assert.ok(!("approval_token" in result.next_steps));
    assert.ok(!("write_page_plan" in result.next_steps));
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("generated maintenance plans enter the normal validate_patch_plan path", async () => {
  const root = createTempRepoRoot();
  buildStoryBundleWorld(root);

  try {
    const result = await withRepoRoot(root, () =>
      planStoryStateMaintenance({
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        parent_page_id: "PG-1",
        reason: "Restamp constraining STEMO with downstream grounding.",
        source_ticket: "tickets/MCPENH-068.md",
        operations: maintenanceOperations()
      })
    );
    assert.ok(!("code" in result), JSON.stringify(result, null, 2));

    const validation = await withRepoRoot(root, () => validatePatchPlan({ patch_plan: result.patch_plan }));
    assert.ok(!("code" in validation), JSON.stringify(validation, null, 2));
    const ownedFailureValidators = new Set([
      "record_schema_compliance",
      "state_snapshot_integrity",
      "midstory_record_introduction_grounding",
      "validation_trace_shape_compliance"
    ]);
    const ownedVerdicts = validation.verdicts.filter((verdict) =>
      ownedFailureValidators.has(verdict.validator) &&
      (verdict.location?.node_id === "opening-bells:SE-2" ||
        verdict.location?.node_id === "opening-bells:PG-2")
    );
    assert.deepEqual(ownedVerdicts, [], JSON.stringify(validation, null, 2));
    assert.ok(
      validation.validators_run.some(
        (entry) => entry.validator_name === "id_allocation_race" && entry.status === "pass"
      )
    );
    assert.ok(validation.validators_run.some((entry) => entry.validator_name === "record_schema_compliance"));
    assert.ok(
      validation.validators_run.some(
        (entry) => entry.validator_name === "validation_trace_shape_compliance" && entry.status === "pass"
      )
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("planStoryStateMaintenance rejects mismatched supersession records before planning", async () => {
  const root = createTempRepoRoot();
  buildStoryBundleWorld(root);

  try {
    const result = await withRepoRoot(root, () =>
      planStoryStateMaintenance({
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        parent_page_id: "PG-1",
        reason: "Bad maintenance request.",
        source_ticket: "tickets/MCPENH-068.md",
        operations: [
          {
            action: "supersede",
            record_type: "story_emotion_record",
            supersedes: "STPLAN-1",
            record: { story_id: "STORY-1" }
          }
        ]
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "operations[0].supersedes");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("planStoryStateMaintenance requires a parent_page_id before allocation", async () => {
  const result = await planStoryStateMaintenance({
    world_slug: STORY_FIXTURE_WORLD,
    story_slug: STORY_FIXTURE_SLUG,
    parent_page_id: "not-a-page",
    reason: "Bad maintenance request.",
    source_ticket: "tickets/MCPENH-068.md",
    operations: maintenanceOperations()
  });

  assert.ok("code" in result);
  assert.equal(result.code, "invalid_input");
  assert.equal(result.details?.field, "parent_page_id");
});
