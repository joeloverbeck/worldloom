import assert from "node:assert/strict";
import test from "node:test";

import { nonPropagationFactsCompleteness } from "../../src/structural/non-propagation-facts-completeness.js";
import { context, record } from "./helpers.js";

test("non_propagation_facts_completeness accepts cited reasons with structured entries", async () => {
  const verdicts = await nonPropagationFactsCompleteness.run(
    undefined,
    context([
      storyEvent("SE-1", {
        world_logic_rationale: "The public group receives no update because evidence_concealed applies.",
        non_propagation_facts: [
          {
            reason: "evidence_concealed",
            group: "public",
            records: ["BEL-12"]
          }
        ]
      })
    ])
  );

  assert.deepEqual(verdicts, []);
});

test("non_propagation_facts_completeness rejects cited reasons without structured entries", async () => {
  const verdicts = await nonPropagationFactsCompleteness.run(
    undefined,
    context([
      storyEvent("SE-1", {
        world_logic_rationale: "The public group receives no update because evidence_concealed applies."
      })
    ])
  );

  assert.deepEqual(verdicts.map((verdict) => verdict.code), [
    "non_propagation_facts_completeness.missing_structured_entry"
  ]);
  assert.equal(verdicts[0]?.severity, "fail");
});

test("non_propagation_facts_completeness accepts prose with no reason references", async () => {
  const verdicts = await nonPropagationFactsCompleteness.run(
    undefined,
    context([
      storyEvent("SE-1", {
        world_logic_rationale: "The selected event follows from branch state.",
        non_propagation_facts: []
      })
    ])
  );

  assert.deepEqual(verdicts, []);
});

test("non_propagation_facts_completeness de-duplicates repeated missing reasons", async () => {
  const verdicts = await nonPropagationFactsCompleteness.run(
    undefined,
    context([
      storyEvent("SE-1", {
        world_logic_rationale:
          "evidence_concealed prevents public witness propagation; evidence_concealed remains the reason."
      })
    ])
  );

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.detail && (verdicts[0].detail as { reason: string }).reason, "evidence_concealed");
});

test("non_propagation_facts_completeness is scoped to full-world, touched SE files, and create_se_record plans", () => {
  assert.equal(
    nonPropagationFactsCompleteness.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") })),
    false
  );
  assert.equal(
    nonPropagationFactsCompleteness.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") })),
    true
  );
  assert.equal(nonPropagationFactsCompleteness.applies_to(context([], { run_mode: "full-world" })), true);
  assert.equal(
    nonPropagationFactsCompleteness.applies_to(
      context([], { run_mode: "incremental", touched_files: ["stories/test-story/_source/events/SE-1.yaml"] })
    ),
    true
  );
});

function storyEvent(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...record("story_event_record", `test-story:${id}`, `stories/test-story/_source/events/${id}.yaml`, {
      id,
      story_id: "STORY-1",
      created_at_page: "PG-1",
      parent_page_id: "PG-1",
      event_kind: "selected_choice",
      actor: "STENT-1",
      commitment: {
        selected_slt_id: "SLT-1",
        selection_source: "emitted_choice",
        alias_bindings: {}
      },
      outcome_route: "accept",
      world_logic_rationale: "The selected event follows from branch state.",
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
    plan_id: "plan-expected-witness",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "story_audit",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "SE-1" } } }]
  };
}
