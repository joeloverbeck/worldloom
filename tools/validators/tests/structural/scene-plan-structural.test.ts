import assert from "node:assert/strict";
import test from "node:test";

import { scenePlanStructural } from "../../src/structural/scene-plan-structural.js";
import { context } from "./helpers.js";

const STORY = "red-bunny";
const PLAN_PATH = `stories/${STORY}/scene-prose-plans/SCN-1.md`;

test("scene_plan_structural passes a complete scene plan", async () => {
  const verdicts = await run(plan());

  assert.deepEqual(verdicts, []);
});

test("scene_plan_structural fails when the scene title is missing", async () => {
  const verdicts = await run(plan().replace("# Scene: Bench Talk", "# Bench Talk"));

  assert.ok(verdicts.some((verdict) => verdict.code === "scene_plan_structural.missing_title"));
});

test("scene_plan_structural fails when required sections are missing", async () => {
  const verdicts = await run(plan({ omit: ["Beat Chain", "Choice Surface"] }));

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.code, "scene_plan_structural.missing_sections");
  assert.deepEqual((verdicts[0]?.detail as { missing_sections?: string[] }).missing_sections, [
    "beat_chain",
    "choice_surface"
  ]);
});

async function run(content: string) {
  return scenePlanStructural.run({ files: [{ path: PLAN_PATH, content }] }, context([]));
}

function plan(options: { omit?: string[] } = {}): string {
  const omit = new Set(options.omit ?? []);
  const sections = [
    "## 2. Content Policy",
    "## 3. Prose Craft Contract",
    "## 4. Render Mission",
    "## 5. What Changes in This Scene",
    "## 6. Where the Scene Begins / Must End",
    "## 7. Beat Chain",
    "## 8. POV / Observer Firewall",
    "## 9. Cast & Voice",
    "## 10. Emotional / Relationship Throughline",
    "## 11. Physical Continuity",
    "## 12. Secrets & Forbidden Reveals",
    "## 13. Choice Surface",
    "## 14. Render-Time Instruction"
  ].filter((heading) => !omit.has(heading.replace(/^##\s+\d+\.\s+/, "")));
  return ["# Scene: Bench Talk", "", ...sections.flatMap((heading) => [heading, "", "Plain prose."])]
    .join("\n");
}
