import assert from "node:assert/strict";
import test from "node:test";

import type { IndexedRecord } from "../../src/framework/types.js";
import { scnNoNarrativeShapeLanguage } from "../../src/structural/scn-no-narrative-shape-language.js";
import { context, record } from "./helpers.js";

const STORY = "red-bunny";
const PLAN_PATH = `stories/${STORY}/scene-prose-plans/SCN-1.md`;

test("scn_no_narrative_shape_language passes factual scene descriptors and body prose", async () => {
  const verdicts = await scnNoNarrativeShapeLanguage.run(
    { files: [{ path: PLAN_PATH, content: plan("The rabbits sit closer by the end.") }] },
    context([scene()])
  );

  assert.deepEqual(verdicts, []);
});

test("scn_no_narrative_shape_language rejects narrative-shape language in SCN records", async () => {
  const verdicts = await scnNoNarrativeShapeLanguage.run(undefined, context([
    scene({ scene_descriptor: "This scene builds toward the midpoint confrontation." })
  ]));

  assert.equal(verdicts.length, 2);
  assert.ok(verdicts.every((verdict) => verdict.code === "scn_no_narrative_shape_language.record_token"));
});

test("scn_no_narrative_shape_language rejects narrative-shape language in scene plans", async () => {
  const verdicts = await scnNoNarrativeShapeLanguage.run(
    { files: [{ path: PLAN_PATH, content: plan("The scene reaches the climax of Act II.") }] },
    context([])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "scn_no_narrative_shape_language.plan_token"));
});

function scene(overrides: Record<string, unknown> = {}): IndexedRecord {
  return {
    ...record("scene_record", "SCN-1", `stories/${STORY}/_source/scenes/SCN-1.yaml`, {
      id: "SCN-1",
      scene_descriptor: "The bench exchange changes the immediate terms.",
      boundary_rationale: "The place, cast, and exchange remain continuous.",
      ...overrides
    }),
    story_slug: STORY
  };
}

function plan(beat: string): string {
  return [
    "# Scene: Bench Talk",
    "",
    "## 7. Beat Chain",
    beat
  ].join("\n");
}
