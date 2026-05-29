import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

import { build } from "../src/commands/build.js";
import { querySceneCoverage } from "../src/public/types.js";
import { cleanup, createAtomicRepoRoot } from "./helpers/atomic-fixture.js";

test("scene coverage derives active scenes, unscened runs, PG lookup, and publication indicators", () => {
  const root = createAtomicRepoRoot();
  const world = path.join(root, "worlds", "atomic-world");

  try {
    writeStory(world, "harborwatch", "pages", "PG-2.yaml", [
      "id: PG-2",
      "story_id: STORY-1",
      "branch_id: BR-0001",
      "parent_page_id: PG-0001",
      "branch_path: [PG-0001, PG-2]",
      "state_snapshot: {}"
    ]);
    writeStory(world, "harborwatch", "pages", "PG-3.yaml", [
      "id: PG-3",
      "story_id: STORY-1",
      "branch_id: BR-0001",
      "parent_page_id: PG-2",
      "branch_path: [PG-0001, PG-2, PG-3]",
      "state_snapshot: {}"
    ]);
    writeStory(world, "harborwatch", "pages", "PG-4.yaml", [
      "id: PG-4",
      "story_id: STORY-1",
      "branch_id: BR-0001",
      "parent_page_id: PG-3",
      "branch_path: [PG-0001, PG-2, PG-3, PG-4]",
      "state_snapshot: {}"
    ]);
    writeStory(world, "harborwatch", "pages", "PG-5.yaml", [
      "id: PG-5",
      "story_id: STORY-1",
      "branch_id: BR-0001",
      "parent_page_id: PG-4",
      "branch_path: [PG-0001, PG-2, PG-3, PG-4, PG-5]",
      "state_snapshot: {}"
    ]);
    writeStory(world, "harborwatch", "branches", "BR-0001.yaml", [
      "id: BR-0001",
      "story_id: STORY-1",
      "root_page_id: PG-0001",
      "current_leaf_page_id: PG-5",
      "forked_from_page_id: null"
    ]);
    writeStory(world, "harborwatch", "scenes", "SCN-1.yaml", [
      "id: SCN-1",
      "story_id: STORY-1",
      "branch_id: BR-0001",
      "previous_scene_id: null",
      "supersedes: null",
      "pg_ids: [PG-0001, PG-2]",
      "emitted_choice_ids: []"
    ]);
    writeStory(world, "harborwatch", "scenes", "SCN-2.yaml", [
      "id: SCN-2",
      "story_id: STORY-1",
      "branch_id: BR-0001",
      "previous_scene_id: null",
      "supersedes: SCN-1",
      "pg_ids: [PG-0001, PG-2, PG-3]",
      "emitted_choice_ids: []"
    ]);
    writeStory(world, "harborwatch", "scenes", "SCN-3.yaml", [
      "id: SCN-3",
      "story_id: STORY-1",
      "branch_id: BR-0001",
      "previous_scene_id: SCN-2",
      "supersedes: null",
      "pg_ids: [PG-4]",
      "emitted_choice_ids: []"
    ]);
    writeStoryArtifact(world, "harborwatch", "scene-prose-plans/SCN-2.md", ["# Plan"]);
    writeStoryArtifact(world, "harborwatch", "scene-prose/SCN-2.md", ["# Prose"]);
    writeStoryArtifact(world, "harborwatch", "scene-prose-receipts/SCN-2.yaml", [
      "scene_id: SCN-2",
      "verdict: WARN"
    ]);
    writeStoryArtifact(world, "harborwatch", "scene-prose/SCN-3.md", ["# Prose"]);

    assert.equal(build(root, "atomic-world"), 0);

    const db = new Database(path.join(world, "_index", "world.db"), { readonly: true });
    try {
      const coverage = querySceneCoverage(db, {
        worldSlug: "atomic-world",
        storySlug: "harborwatch",
        branchId: "BR-0001"
      });

      assert.equal(coverage.length, 1);
      const branch = coverage[0];
      assert.notEqual(branch, undefined);
      if (branch === undefined) {
        throw new Error("Expected scene coverage for BR-0001.");
      }
      assert.deepEqual(branch.active_scene_ids, ["SCN-2", "SCN-3"]);
      assert.deepEqual(branch.superseded_scene_ids, ["SCN-1"]);
      assert.deepEqual(branch.pg_scene_lookup, {
        "PG-0001": ["SCN-2"],
        "PG-2": ["SCN-2"],
        "PG-3": ["SCN-2"],
        "PG-4": ["SCN-3"]
      });
      assert.deepEqual(branch.unscened_runs, [
        {
          start_pg: "PG-5",
          end_pg: "PG-5",
          pg_ids: ["PG-5"]
        }
      ]);
      assert.equal(branch.scenes.find((scene) => scene.scene_id === "SCN-1")?.publication_indicator, "superseded");
      assert.equal(branch.scenes.find((scene) => scene.scene_id === "SCN-2")?.publication_indicator, "attached:WARN");
      assert.equal(branch.scenes.find((scene) => scene.scene_id === "SCN-3")?.publication_indicator, "prose-present");
      assert.deepEqual(branch.scenes.find((scene) => scene.scene_id === "SCN-2")?.artifact_availability, {
        plan_present: true,
        prose_present: true,
        receipt_present: true,
        receipt_verdict: "WARN"
      });
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

test("scene coverage isolates fork branches and treats zero-scene branch paths as unscened", () => {
  const root = createAtomicRepoRoot();
  const world = path.join(root, "worlds", "atomic-world");

  try {
    writeStory(world, "harborwatch", "pages", "PG-2.yaml", [
      "id: PG-2",
      "story_id: STORY-1",
      "branch_id: BR-0001",
      "parent_page_id: PG-0001",
      "branch_path: [PG-0001, PG-2]",
      "state_snapshot: {}"
    ]);
    writeStory(world, "harborwatch", "pages", "PG-6.yaml", [
      "id: PG-6",
      "story_id: STORY-1",
      "branch_id: BR-0002",
      "parent_page_id: PG-0001",
      "branch_path: [PG-0001, PG-6]",
      "state_snapshot: {}"
    ]);
    writeStory(world, "harborwatch", "branches", "BR-0001.yaml", [
      "id: BR-0001",
      "story_id: STORY-1",
      "root_page_id: PG-0001",
      "current_leaf_page_id: PG-2",
      "forked_from_page_id: null"
    ]);
    writeStory(world, "harborwatch", "branches", "BR-0002.yaml", [
      "id: BR-0002",
      "story_id: STORY-1",
      "root_page_id: PG-0001",
      "current_leaf_page_id: PG-6",
      "forked_from_page_id: PG-0001"
    ]);
    writeStory(world, "harborwatch", "scenes", "SCN-1.yaml", [
      "id: SCN-1",
      "story_id: STORY-1",
      "branch_id: BR-0001",
      "previous_scene_id: null",
      "supersedes: null",
      "pg_ids: [PG-0001, PG-2]",
      "emitted_choice_ids: []"
    ]);

    assert.equal(build(root, "atomic-world"), 0);

    const db = new Database(path.join(world, "_index", "world.db"), { readonly: true });
    try {
      const parentCoverage = querySceneCoverage(db, {
        worldSlug: "atomic-world",
        storySlug: "harborwatch",
        branchId: "BR-0001"
      })[0];
      const forkCoverage = querySceneCoverage(db, {
        worldSlug: "atomic-world",
        storySlug: "harborwatch",
        branchId: "BR-0002"
      })[0];

      assert.deepEqual(parentCoverage?.active_scene_ids, ["SCN-1"]);
      assert.deepEqual(parentCoverage?.unscened_runs, []);
      assert.deepEqual(forkCoverage?.active_scene_ids, []);
      assert.deepEqual(forkCoverage?.pg_scene_lookup, {});
      assert.deepEqual(forkCoverage?.unscened_runs, [
        {
          start_pg: "PG-0001",
          end_pg: "PG-6",
          pg_ids: ["PG-0001", "PG-6"]
        }
      ]);
    } finally {
      db.close();
    }
  } finally {
    cleanup(root);
  }
});

function writeStory(
  world: string,
  storySlug: string,
  directory: string,
  fileName: string,
  lines: string[]
): void {
  const targetDirectory = path.join(world, "stories", storySlug, "_source", directory);
  mkdirSync(targetDirectory, { recursive: true });
  writeFileSync(path.join(targetDirectory, fileName), `${lines.join("\n")}\n`, "utf8");
}

function writeStoryArtifact(
  world: string,
  storySlug: string,
  relativeFilePath: string,
  lines: string[]
): void {
  const targetPath = path.join(world, "stories", storySlug, relativeFilePath);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, `${lines.join("\n")}\n`, "utf8");
}
