import assert from "node:assert/strict";
import test from "node:test";

import type { IndexedRecord } from "../../src/framework/types.js";
import { sceneRangeIntegrity } from "../../src/structural/scene-range-integrity.js";
import { context, record } from "./helpers.js";

const STORY = "red-bunny";

test("scene_range_integrity passes contiguous single-branch scene ranges with end-PG choices", async () => {
  const verdicts = await run([
    scene(),
    page("PG-1", ["PG-1"]),
    page("PG-2", ["PG-1", "PG-2"]),
    page("PG-3", ["PG-1", "PG-2", "PG-3"], { emitted_choices: ["CHC-1", "CHC-2"] })
  ]);

  assert.deepEqual(verdicts, []);
});

test("scene_range_integrity rejects non-contiguous ranges", async () => {
  const verdicts = await run([
    scene({ pg_ids: ["PG-1", "PG-3"], start_page_id: "PG-1", end_page_id: "PG-3", choice_surface_page_id: "PG-3" }),
    page("PG-1", ["PG-1"]),
    page("PG-2", ["PG-1", "PG-2"]),
    page("PG-3", ["PG-1", "PG-2", "PG-3"])
  ]);

  assert.ok(verdicts.some((verdict) => verdict.code === "scene_range_integrity.non_contiguous"));
});

test("scene_range_integrity rejects cross-branch and sibling-inclusive ranges", async () => {
  const verdicts = await run([
    scene({ pg_ids: ["PG-2", "PG-4"], start_page_id: "PG-2", end_page_id: "PG-4", choice_surface_page_id: "PG-4" }),
    page("PG-2", ["PG-1", "PG-2"], { branch_id: "BR-1" }),
    page("PG-4", ["PG-1", "PG-3", "PG-4"], { branch_id: "BR-2" })
  ]);

  assert.ok(verdicts.some((verdict) => verdict.code === "scene_range_integrity.single_branch"));
  assert.ok(verdicts.some((verdict) => verdict.code === "scene_range_integrity.sibling_in_range"));
});

test("scene_range_integrity rejects choice surfaces that do not match the end PG", async () => {
  const verdicts = await run([
    scene({ emitted_choice_ids: ["CHC-1"], choice_surface_page_id: "PG-2" }),
    page("PG-1", ["PG-1"]),
    page("PG-2", ["PG-1", "PG-2"]),
    page("PG-3", ["PG-1", "PG-2", "PG-3"], { emitted_choices: ["CHC-2"] })
  ]);

  assert.ok(verdicts.some((verdict) => verdict.code === "scene_range_integrity.choice_surface_not_end_page"));
  assert.ok(verdicts.some((verdict) => verdict.code === "scene_range_integrity.choice_surface_mismatch"));
});

async function run(records: IndexedRecord[]) {
  return sceneRangeIntegrity.run(undefined, context(records));
}

function storyRecord(nodeType: string, id: string, filePath: string, parsed: Record<string, unknown>): IndexedRecord {
  return {
    ...record(nodeType, id, filePath, parsed),
    story_slug: STORY
  };
}

function scene(overrides: Record<string, unknown> = {}): IndexedRecord {
  return storyRecord("scene_record", "SCN-1", `stories/${STORY}/_source/scenes/SCN-1.yaml`, {
    id: "SCN-1",
    story_id: "STORY-1",
    branch_id: "BR-1",
    status: "planned",
    pg_ids: ["PG-1", "PG-2", "PG-3"],
    start_page_id: "PG-1",
    end_page_id: "PG-3",
    previous_scene_id: null,
    choice_surface_page_id: "PG-3",
    emitted_choice_ids: ["CHC-1", "CHC-2"],
    title: "Bench Talk",
    slug: "bench-talk",
    scene_descriptor: "The bench conversation changes the immediate terms.",
    boundary_rationale: "The exchange remains continuous in place and cast.",
    prose_plan_path: "scene-prose-plans/SCN-1.md",
    prose_path: "scene-prose/SCN-1.md",
    receipt_path: "scene-prose-receipts/SCN-1.yaml",
    ...overrides
  });
}

function page(id: string, branchPath: string[], overrides: Record<string, unknown> = {}): IndexedRecord {
  return storyRecord("page_record", id, `stories/${STORY}/_source/pages/${id}.yaml`, {
    id,
    story_id: "STORY-1",
    branch_id: overrides.branch_id ?? "BR-1",
    parent_page_id: branchPath.length > 1 ? branchPath[branchPath.length - 2] : null,
    branch_path: branchPath,
    turn_index: branchPath.length - 1,
    emitted_choices: [],
    ...overrides
  });
}
