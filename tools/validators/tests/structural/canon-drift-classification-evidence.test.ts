import assert from "node:assert/strict";
import test from "node:test";

import { canonDriftClassificationEvidence } from "../../src/structural/canon-drift-classification-evidence.js";
import { context, record } from "./helpers.js";

test("canon_drift_classification_evidence warns when compatible drift lacks CH-window citation", async () => {
  const verdicts = await canonDriftClassificationEvidence.run(
    undefined,
    context([
      change("CH-0001"),
      change("CH-0002"),
      change("CH-0003"),
      page("PG-0002", {
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
      change("CH-0001"),
      change("CH-0002"),
      change("CH-0003"),
      page("PG-0002", {
        parent_snapshot_compatibility:
          "PASS: compatible after reviewing CH-0002 and CH-0003; affected facts do not touch active state."
      })
    ])
  );

  assert.deepEqual(verdicts, []);
});

test("canon_drift_classification_evidence accepts event-rationale CH-window citation", async () => {
  const verdicts = await canonDriftClassificationEvidence.run(
    undefined,
    context([
      change("CH-0001"),
      change("CH-0002"),
      change("CH-0003"),
      event("SE-0002", "Drift classified compatible after CH-0002 review."),
      page("PG-0002", {
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
      change("CH-0001"),
      change("CH-0002"),
      page("PG-0002", {
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
    affected_fact_ids: ["CF-0001"]
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
      input: { resolved_event_id: "SE-0002" },
      state_snapshot: { canon_revision: "CH-0001" },
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
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "PG-0002" } } }]
  };
}
