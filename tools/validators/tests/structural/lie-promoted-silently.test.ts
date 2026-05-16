import assert from "node:assert/strict";
import test from "node:test";

import { liePromotedSilently } from "../../src/structural/lie-promoted-silently.js";
import { context, record } from "./helpers.js";

test("lie_promoted_silently accepts SF records with no BEL parents", async () => {
  const verdicts = await liePromotedSilently.run(undefined, context([
    storyFact("SF-1", { authority: "branch_local", derived_from: ["CF-1", "SE-3"] })
  ]));

  assert.deepEqual(verdicts, []);
});

test("lie_promoted_silently accepts explicit counterfactual SF authority for non-true BELs", async () => {
  const verdicts = await liePromotedSilently.run(undefined, context([
    storyFact("SF-1", { authority: "branch_local_counterfactual", derived_from: ["BEL-5"] }),
    belief("BEL-5", "false")
  ]));

  assert.deepEqual(verdicts, []);
});

test("lie_promoted_silently accepts true BEL promotion to branch-local fact", async () => {
  const verdicts = await liePromotedSilently.run(undefined, context([
    storyFact("SF-1", { authority: "branch_local", derived_from: ["BEL-7"] }),
    belief("BEL-7", "true")
  ]));

  assert.deepEqual(verdicts, []);
});

test("lie_promoted_silently rejects branch-local facts derived from false BELs", async () => {
  const verdicts = await liePromotedSilently.run(undefined, context([
    storyFact("SF-1", { authority: "branch_local", derived_from: ["BEL-9"] }),
    belief("BEL-9", "false")
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.validator, "lie_promoted_silently");
  assert.equal(verdicts[0]?.code, "lie_promoted_silently");
  assert.deepEqual(verdicts[0]?.detail, {
    fact_id: "SF-1",
    authority: "branch_local",
    belief_id: "BEL-9",
    truth_relation: "false",
    reference_path: "derived_from[0]"
  });
});

test("lie_promoted_silently rejects canon-candidate facts derived from contested BELs", async () => {
  const verdicts = await liePromotedSilently.run(undefined, context([
    storyFact("SF-1", { authority: "canon_candidate", derived_from: ["BEL-11"] }),
    belief("BEL-11", "contested")
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "lie_promoted_silently");
  assert.equal((verdicts[0]?.detail as { truth_relation?: string }).truth_relation, "contested");
});

test("lie_promoted_silently rejects canon-linked facts derived from counterfactual BELs", async () => {
  const verdicts = await liePromotedSilently.run(undefined, context([
    storyFact("SF-1", { authority: "canon_linked", derived_from: ["CF-3", "BEL-13"] }),
    belief("BEL-13", "branch_counterfactual")
  ]));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "lie_promoted_silently");
  assert.deepEqual(verdicts[0]?.detail, {
    fact_id: "SF-1",
    authority: "canon_linked",
    belief_id: "BEL-13",
    truth_relation: "branch_counterfactual",
    reference_path: "derived_from[1]"
  });
});

test("lie_promoted_silently is scoped to full-world, create SF plans, and touched SF files", () => {
  assert.equal(liePromotedSilently.applies_to(context([])), true);
  assert.equal(liePromotedSilently.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") })), false);
  assert.equal(liePromotedSilently.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_sf_record") })), true);
  assert.equal(
    liePromotedSilently.applies_to(context([], { run_mode: "incremental", touched_files: ["stories/test/_source/facts/SF-1.yaml"] })),
    true
  );
});

function storyFact(id: string, overrides: Record<string, unknown>) {
  return storyRecord("story_fact_record", id, "facts", {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    statement: "A branch-local fact.",
    ...overrides
  });
}

function belief(id: string, truthRelation: string) {
  return storyRecord("belief_record", id, "beliefs", {
    id,
    story_id: "STORY-1",
    holder: "STENT-1",
    truth_relation: truthRelation,
    confidence: "high",
    visibility: "private",
    claim: "A belief about the world.",
    basis: { access_records: [] }
  });
}

function storyRecord(nodeType: string, id: string, sourceDir: string, parsed: Record<string, unknown>) {
  return {
    ...record(nodeType, `test-story:${id}`, `stories/test-story/_source/${sourceDir}/${id}.yaml`, parsed),
    story_slug: "test-story"
  };
}

function patchPlan(op: "create_pg_record" | "create_sf_record") {
  return {
    plan_id: "plan-lie-promoted-silently",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "story_audit",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "SF-1" } } }]
  };
}
