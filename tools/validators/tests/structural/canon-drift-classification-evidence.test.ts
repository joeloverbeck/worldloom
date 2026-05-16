import assert from "node:assert/strict";
import test from "node:test";

import { canonDriftClassificationEvidence } from "../../src/structural/canon-drift-classification-evidence.js";
import { context, record } from "./helpers.js";

test("canon_drift_classification_evidence warns when compatible drift lacks CH-window citation", async () => {
  const verdicts = await canonDriftClassificationEvidence.run(
    undefined,
    context([
      change("CH-1"),
      change("CH-2"),
      change("CH-3"),
      page("PG-2", {
        parent_snapshot_compatibility: "PASS: compatible with current canon; no relevant changes."
      })
    ])
  );

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "canon_drift_classification_missing_evidence");
  assert.equal(verdicts[0]?.severity, "warn");
});

test("canon_drift_classification_evidence accepts compatible drift with CH-window citation", async () => {
  const verdicts = await canonDriftClassificationEvidence.run(
    undefined,
    context([
      change("CH-1"),
      change("CH-2"),
      change("CH-3"),
      page("PG-2", {
        parent_snapshot_compatibility:
          "PASS: compatible after reviewing CH-2 and CH-3; affected facts do not touch active state."
      })
    ])
  );

  assert.deepEqual(verdicts, []);
});

test("canon_drift_classification_evidence accepts event-rationale CH-window citation", async () => {
  const verdicts = await canonDriftClassificationEvidence.run(
    undefined,
    context([
      change("CH-1"),
      change("CH-2"),
      change("CH-3"),
      event("SE-2", "Drift classified compatible after CH-2 review."),
      page("PG-2", {
        parent_snapshot_compatibility: "PASS: compatible with current canon."
      })
    ])
  );

  assert.deepEqual(verdicts, []);
});

test("canon_drift_classification_evidence ignores one-CH drift windows", async () => {
  const verdicts = await canonDriftClassificationEvidence.run(
    undefined,
    context([
      change("CH-1"),
      change("CH-2"),
      page("PG-2", {
        parent_snapshot_compatibility: "PASS: compatible with current canon."
      })
    ])
  );

  assert.deepEqual(verdicts, []);
});

test("canon_drift_classification_evidence is pre-apply scoped to create_pg_record plans", () => {
  assert.equal(canonDriftClassificationEvidence.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") })), false);
  assert.equal(canonDriftClassificationEvidence.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") })), true);
});

function change(id: string) {
  return record("change_log_entry", id, `_source/change-log/${id}.yaml`, {
    change_id: id,
    affected_fact_ids: ["CF-1"]
  });
}

function event(id: string, worldLogicRationale: string) {
  return {
    ...record("story_event_record", `test-story:${id}`, `stories/test-story/_source/events/${id}.yaml`, {
      id,
      world_logic_rationale: worldLogicRationale
    }),
    story_slug: "test-story"
  };
}

function page(id: string, validationTrace: Record<string, string>) {
  return {
    ...record("page_record", `test-story:${id}`, `stories/test-story/_source/pages/${id}.yaml`, {
      id,
      input: { resolved_event_id: "SE-2" },
      state_snapshot: { canon_revision: "CH-1" },
      validation_trace: validationTrace
    }),
    story_slug: "test-story"
  };
}

function patchPlan(op: "create_pg_record" | "create_se_record") {
  return {
    plan_id: "plan-canon-drift",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "story_turn",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "PG-2" } } }]
  };
}
