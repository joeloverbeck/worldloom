import assert from "node:assert/strict";
import test from "node:test";

import { recordIntroductionUniqueness } from "../../src/structural/record-introduction-uniqueness.js";
import { context, record } from "./helpers.js";

test("record_introduction_uniqueness rejects duplicate record_id entries with differing bodies", async () => {
  const verdicts = await recordIntroductionUniqueness.run(
    undefined,
    context([
      event("SE-1", {
        record_introductions: [
          {
            record_id: "THR-1",
            class: "THR",
            trigger: "investigation_line_opened",
            evidence: ["SE-1"],
            distinct_from: []
          },
          {
            record_id: "THR-1",
            class: "THR",
            trigger: "mission_line_opened",
            evidence: ["SE-1"],
            distinct_from: ["THR-0"],
            rationale: "The second entry conflicts with the first."
          }
        ]
      })
    ])
  );

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.validator, "record_introduction_uniqueness");
  assert.equal(verdicts[0]?.code, "record_introduction_duplicate_record_id");
  assert.deepEqual(verdicts[0]?.detail, {
    event_id: "test-story:SE-1",
    record_id: "THR-1",
    first_index: 0,
    duplicate_index: 1
  });
});

test("record_introduction_uniqueness accepts distinct record_id entries", async () => {
  const verdicts = await recordIntroductionUniqueness.run(
    undefined,
    context([
      event("SE-1", {
        record_introductions: [
          {
            record_id: "THR-1",
            class: "THR",
            trigger: "investigation_line_opened",
            evidence: ["SE-1"],
            distinct_from: []
          },
          {
            record_id: "CLK-1",
            class: "CLK",
            trigger: "deadline_declared",
            evidence: ["SE-1"],
            distinct_from: []
          }
        ]
      })
    ])
  );

  assert.deepEqual(verdicts, []);
});

test("record_introduction_uniqueness is pre-apply scoped to create_se_record plans", () => {
  assert.equal(
    recordIntroductionUniqueness.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") })),
    false
  );
  assert.equal(
    recordIntroductionUniqueness.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") })),
    true
  );
});

function event(id: string, overrides: Record<string, unknown>) {
  return {
    ...record("story_event_record", `test-story:${id}`, `stories/test-story/_source/events/${id}.yaml`, {
      id,
      story_id: "STORY-1",
      created_at_page: "PG-2",
      parent_page_id: "PG-1",
      event_kind: "turn",
      actor: "STENT-1",
      targets: [],
      commitment: {
        selected_slt_id: "SLT-1",
        selection_source: "author_pool",
        alias_bindings: {}
      },
      outcome_route: "accept",
      world_logic_rationale: "Structured introductions are validated outside prose.",
      state_delta: {
        create: [],
        supersede: [],
        close: []
      },
      promotion_claims: [],
      ...overrides
    }),
    story_slug: "test-story"
  };
}

function patchPlan(op: "create_pg_record" | "create_se_record") {
  return {
    plan_id: "plan-record-introduction-uniqueness",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "story_event",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "SE-1" } } }]
  };
}
