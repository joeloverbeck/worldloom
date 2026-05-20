import assert from "node:assert/strict";
import test from "node:test";

import { chcSltEligibilitySourceGrounding } from "../../src/structural/chc-slt-eligibility-source-grounding.js";
import { context, record } from "./helpers.js";

test("chc_slt_eligibility_source_grounding accepts exact predicate-record grounding", async () => {
  const verdicts = await chcSltEligibilitySourceGrounding.run(undefined, context([
    storylet("SLT-1", [{ pred: "record_active", record: "STPLAN-1" }]),
    choice("CHC-1", {
      associated_commitment_block: "SLT-1",
      grounded_in: { records: ["STPLAN-1"] }
    })
  ]));

  assert.deepEqual(verdicts, []);
});

test("chc_slt_eligibility_source_grounding accepts explicit background-only rationale", async () => {
  const verdicts = await chcSltEligibilitySourceGrounding.run(undefined, context([
    storylet("SLT-1", [{ pred: "secret_unrevealed", secret: "STSEC-1" }]),
    choice("CHC-1", {
      associated_commitment_block: "SLT-1",
      grounded_in: { records: ["STENT-1"] },
      likely_state_pressure: "The secret shapes the menu in the background. eligibility_background_only: STSEC-1."
    })
  ]));

  assert.deepEqual(verdicts, []);
});

test("chc_slt_eligibility_source_grounding fails missing eligibility-source grounding", async () => {
  const verdicts = await chcSltEligibilitySourceGrounding.run(undefined, context([
    storylet("SLT-1", [{ pred: "clock_at_least", clock: "CLK-1", value: 2 }]),
    choice("CHC-1", {
      associated_commitment_block: "SLT-1",
      grounded_in: { records: ["STENT-1"] }
    })
  ]));

  const verdict = verdicts.find((item) => item.code === "chc_slt_eligibility_source_grounding.missing_eligibility_source");
  assert.ok(verdict);
  assert.equal(verdict.severity, "fail");
  assert.deepEqual(verdict.detail, {
    choice_id: "CHC-1",
    associated_commitment_block: "SLT-1",
    grounded_records: ["STENT-1"],
    eligibility_records: ["CLK-1"]
  });
});

test("chc_slt_eligibility_source_grounding warns on weak same-class grounding", async () => {
  const verdicts = await chcSltEligibilitySourceGrounding.run(undefined, context([
    storylet("SLT-1", [{ pred: "record_active", record: "STPLAN-1" }]),
    choice("CHC-1", {
      associated_commitment_block: "SLT-1",
      grounded_in: { records: ["STPLAN-2"] }
    })
  ]));

  const verdict = verdicts.find((item) => item.code === "chc_slt_eligibility_source_grounding.weak_incidental_grounding");
  assert.ok(verdict);
  assert.equal(verdict.severity, "warn");
});

test("chc_slt_eligibility_source_grounding ignores non-storylet-derived choices", async () => {
  const verdicts = await chcSltEligibilitySourceGrounding.run(undefined, context([
    storylet("SLT-1", [{ pred: "record_active", record: "STPLAN-1" }]),
    choice("CHC-1", {
      associated_commitment_block: null,
      grounded_in: { records: ["STENT-1"] }
    })
  ]));

  assert.deepEqual(verdicts, []);
});

test("chc_slt_eligibility_source_grounding is scoped to story page, CHC, and SLT surfaces", () => {
  assert.equal(chcSltEligibilitySourceGrounding.applies_to(context([], { run_mode: "full-world" })), true);
  assert.equal(chcSltEligibilitySourceGrounding.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_chc_record") as never })), true);
  assert.equal(chcSltEligibilitySourceGrounding.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_slt_record") as never })), true);
  assert.equal(chcSltEligibilitySourceGrounding.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") as never })), true);
  assert.equal(chcSltEligibilitySourceGrounding.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_cf_record") as never })), false);
  assert.equal(chcSltEligibilitySourceGrounding.applies_to(context([], { run_mode: "incremental", touched_files: ["stories/test-story/_source/choices/CHC-1.yaml"] })), true);
});

function storylet(id: string, hardPreconditions: unknown[]) {
  return storyRecord("storylet_record", id, "storylets", {
    id,
    story_id: "STORY-1",
    preconditions: { hard: hardPreconditions, soft: [] }
  });
}

function choice(id: string, overrides: Record<string, unknown>) {
  return storyRecord("choice_record", id, "choices", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    surface_label: "Test choice",
    player_visible_intent: "Test the branch.",
    target_or_action_families: ["investigate"],
    likely_state_pressure: "The choice pressure is visible.",
    associated_commitment_block: null,
    grounded_in: { records: ["STENT-1"] },
    ...overrides
  });
}

function storyRecord(nodeType: string, id: string, sourceDir: string, parsed: Record<string, unknown>) {
  return {
    ...record(nodeType, `test-story:${id}`, `stories/test-story/_source/${sourceDir}/${id}.yaml`, parsed),
    story_slug: "test-story"
  };
}

function patchPlan(op: string) {
  return {
    plan_id: "plan-chc-slt-eligibility-source-grounding",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "story_audit",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "CHC-1" } } }]
  };
}
