import assert from "node:assert/strict";
import test from "node:test";

import { validationTraceShapeCompliance } from "../../src/structural/validation-trace-shape-compliance.js";
import { context, record } from "./helpers.js";

const VALIDATION_TRACE = {
  input_legality: "PASS: resolved event and input are lawful.",
  parent_snapshot_compatibility: "PASS: parent state hash matches.",
  mystery_invariant_firewall: "PASS: no forbidden mystery is resolved.",
  branch_isolation: "PASS: active records are branch visible.",
  append_only_delta: "PASS: deltas create, supersede, or close records.",
  consequence_or_terminal: "PASS: consequence capacity is present.",
  plan_grounding: "PASS: plan is grounded in loaded state.",
  canon_promotion_hold: "NOT_APPLICABLE: no promotion claim is present."
};

test("validation_trace_shape_compliance accepts the flat eight-gate mapping", async () => {
  const verdicts = await validationTraceShapeCompliance.run(
    undefined,
    context([pageRecord("PG-0001", VALIDATION_TRACE)])
  );

  assert.deepEqual(verdicts, []);
});

test("validation_trace_shape_compliance rejects a gates array", async () => {
  const verdicts = await validationTraceShapeCompliance.run(
    undefined,
    context([
      pageRecord("PG-0001", {
        gates: Object.entries(VALIDATION_TRACE).map(([gate, result]) => ({ gate, result }))
      })
    ])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "validation_trace_shape_compliance"));
  assert.ok(verdicts.some((verdict) => verdict.message.includes("gates")));
});

test("validation_trace_shape_compliance rejects extraneous keys", async () => {
  const verdicts = await validationTraceShapeCompliance.run(
    undefined,
    context([
      pageRecord("PG-0001", {
        ...VALIDATION_TRACE,
        gates: []
      })
    ])
  );

  assert.ok(verdicts.some((verdict) => JSON.stringify(verdict.detail).includes("gates")));
});

test("validation_trace_shape_compliance rejects missing gate keys", async () => {
  const { plan_grounding: _omitted, ...incompleteTrace } = VALIDATION_TRACE;

  const verdicts = await validationTraceShapeCompliance.run(
    undefined,
    context([pageRecord("PG-0001", incompleteTrace)])
  );

  assert.ok(verdicts.some((verdict) => JSON.stringify(verdict.detail).includes("plan_grounding")));
});

test("validation_trace_shape_compliance is pre-apply scoped to create_pg_record plans", () => {
  assert.equal(
    validationTraceShapeCompliance.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") })),
    false
  );
  assert.equal(
    validationTraceShapeCompliance.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") })),
    true
  );
});

function pageRecord(id: string, validationTrace: unknown) {
  return {
    ...record("page_record", `test-story:${id}`, `stories/test-story/_source/pages/${id}.yaml`, {
      id,
      story_id: "STORY-001",
      branch_id: "BR-0001",
      parent_page_id: null,
      validation_trace: validationTrace
    }),
    story_slug: "test-story"
  };
}

function patchPlan(op: "create_pg_record" | "create_se_record") {
  return {
    plan_id: "plan-validation-trace",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "story_audit",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "PG-0001" } } }]
  };
}
