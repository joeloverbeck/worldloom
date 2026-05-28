import assert from "node:assert/strict";
import test from "node:test";

import { scenePlanBodyEngineVocabularyCleanliness } from "../../src/structural/scene-plan-body-engine-vocabulary-cleanliness.js";
import { context } from "./helpers.js";

const STORY = "red-bunny";
const PLAN_PATH = `stories/${STORY}/scene-prose-plans/SCN-1.md`;

test("scene_plan_body_engine_vocabulary_cleanliness passes renderer-facing scene prose", async () => {
  const verdicts = await run(plan());

  assert.deepEqual(verdicts, []);
});

test("scene_plan_body_engine_vocabulary_cleanliness ignores verbatim contract sections", async () => {
  const verdicts = await run(plan({
    contentPolicy: "PG-1 and validation_trace can appear here because this is canonical policy text."
  }));

  assert.deepEqual(verdicts, []);
});

test("scene_plan_body_engine_vocabulary_cleanliness fails on record IDs, schema fields, predicate DSL, and lifecycle words", async () => {
  const verdicts = await run(plan({
    beatChain: "Use SCN-1 and PG-2, then evaluate record_active(STENT-1) through validation_trace in the validator."
  }));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "scene_plan_body_engine_vocabulary_cleanliness.fail");
  assert.deepEqual(
    (verdicts[0]?.detail as { hits?: Array<{ token: string }> }).hits?.map((hit) => hit.token),
    ["SCN-1", "PG-2", "STENT-1", "validation_trace", "record_active(", "validator"]
  );
});

async function run(content: string) {
  return scenePlanBodyEngineVocabularyCleanliness.run({ files: [{ path: PLAN_PATH, content }] }, context([]));
}

function plan(overrides: { contentPolicy?: string; beatChain?: string } = {}): string {
  return [
    "# Scene: Bench Talk",
    "",
    "## 2. Content Policy",
    overrides.contentPolicy ?? "Policy text.",
    "",
    "## 3. Prose Craft Contract",
    "Craft text.",
    "",
    "## 4. Render Mission",
    "Open on the bench and stop after the exchange changes.",
    "",
    "## 7. Beat Chain",
    overrides.beatChain ?? "The bench exchange narrows trust without naming records.",
    "",
    "## 14. Render-Time Instruction",
    "Instruction text."
  ].join("\n");
}
