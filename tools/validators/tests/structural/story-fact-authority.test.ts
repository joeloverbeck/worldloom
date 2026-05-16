import assert from "node:assert/strict";
import test from "node:test";

import { storyFactAuthority } from "../../src/structural/story-fact-authority.js";
import { context, record } from "./helpers.js";

test("story_fact_authority accepts canon-linked SF records with a CF parent", async () => {
  const result = await storyFactAuthority.run(
    {},
    context([
      storyFactRecord("SF-1", {
        authority: "canon_linked",
        derived_from: ["SE-1", "CF-1"]
      })
    ])
  );

  assert.deepEqual(result, []);
});

test("story_fact_authority rejects canon-linked SF records without a CF parent", async () => {
  const result = await storyFactAuthority.run(
    {},
    context([
      storyFactRecord("SF-1", {
        authority: "canon_linked",
        derived_from: ["SE-1"]
      })
    ])
  );

  assert.equal(result.length, 1);
  assert.equal(result[0]?.validator, "story_fact_authority");
  assert.equal(result[0]?.code, "story_fact_authority.canon_linked_missing_cf_parent");
  assert.equal(result[0]?.location.node_id, "test-story:SF-1");
});

test("story_fact_authority ignores non-canon-linked SF records", async () => {
  const result = await storyFactAuthority.run(
    {},
    context([
      storyFactRecord("SF-1", {
        authority: "branch_local",
        derived_from: []
      })
    ])
  );

  assert.deepEqual(result, []);
});

function storyFactRecord(id: string, overrides: Record<string, unknown>) {
  return {
    ...record("story_fact_record", `test-story:${id}`, `stories/test-story/_source/facts/${id}.yaml`, {
      id,
      story_id: "STORY-1",
      created_at_page: "PG-1",
      statement: "A branch-local fact.",
      ...overrides
    }),
    story_slug: "test-story"
  };
}
