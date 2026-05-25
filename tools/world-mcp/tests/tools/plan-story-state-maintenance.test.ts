import assert from "node:assert/strict";
import test from "node:test";

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
      stemo_ids: ["STEMO-3"]
    });
    assert.deepEqual(
      result.patch_plan.patches.map((patch) => patch.op),
      ["create_srel_record", "create_stplan_record", "create_chc_record", "create_stemo_record"]
    );
    assert.equal(result.patch_plan.patches.at(-1)?.payload.record.id, "STEMO-3");
    assert.equal(result.patch_plan.patches.at(-1)?.payload.record.supersedes, "STEMO-1");
    assert.equal(result.affected_records[0]?.record_id, "STEMO-1");
    assert.ok(!("files_written" in result));
    assert.ok(!("approval_token" in result.next_steps));
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
        reason: "Restamp constraining STEMO with downstream grounding.",
        source_ticket: "tickets/MCPENH-068.md",
        operations: maintenanceOperations()
      })
    );
    assert.ok(!("code" in result), JSON.stringify(result, null, 2));

    const validation = await withRepoRoot(root, () => validatePatchPlan({ patch_plan: result.patch_plan }));
    assert.ok(!("code" in validation), JSON.stringify(validation, null, 2));
    assert.notEqual(validation.status, "skipped", JSON.stringify(validation, null, 2));
    assert.ok(
      validation.validators_run.some(
        (entry) => entry.validator_name === "id_allocation_race" && entry.status === "pass"
      )
    );
    assert.ok(validation.validators_run.some((entry) => entry.validator_name === "record_schema_compliance"));
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
