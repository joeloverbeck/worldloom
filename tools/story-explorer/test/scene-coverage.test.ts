import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { sha256Hex } from "@worldloom/world-index/hash/content";
import { openIndex } from "@worldloom/world-index/index/open";
import type Database from "better-sqlite3";

import { readSceneCoverage, readSceneCoverageBranch } from "../src/read/scene-coverage.js";
import type { ScenePublicationState } from "../src/view-models/scene-publication-state.js";

function createTempRepo(): string {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-scene-coverage-"));
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(repoRoot, "worlds", "fixture-world"), { recursive: true });
  return repoRoot;
}

function insertFreshnessNode(db: Database.Database, repoRoot: string): void {
  const kernelPath = path.join(repoRoot, "worlds", "fixture-world", "WORLD_KERNEL.md");
  writeFileSync(kernelPath, "stable kernel\n", "utf8");
  db.prepare(`
    INSERT INTO nodes (
      node_id,
      world_slug,
      file_path,
      heading_path,
      byte_start,
      byte_end,
      line_start,
      line_end,
      node_type,
      body,
      content_hash,
      anchor_checksum,
      summary,
      created_at_index_version
    )
    VALUES (
      'fixture-world:WORLD_KERNEL',
      'fixture-world',
      'WORLD_KERNEL.md',
      NULL,
      0,
      0,
      1,
      1,
      'world_kernel',
      'stable kernel',
      ?,
      'anchor',
      NULL,
      1
    )
  `).run(sha256Hex("stable kernel\n"));
  db.prepare(`
    INSERT INTO file_versions (world_slug, file_path, content_hash, last_indexed_at)
    VALUES ('fixture-world', 'WORLD_KERNEL.md', ?, '2026-05-29T00:00:00.000Z')
  `).run(sha256Hex("stable kernel\n"));
}

function insertCoverage(
  db: Database.Database,
  branchId: string,
  publicationIndicator: ScenePublicationState,
): void {
  db.prepare(`
    INSERT INTO scene_coverage (
      world_slug,
      story_slug,
      branch_id,
      active_scene_ids_json,
      superseded_scene_ids_json,
      unscened_ranges_json,
      pg_scene_lookup_json,
      scenes_json,
      refreshed_at
    ) VALUES (
      'fixture-world',
      'red-bunny',
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      '2026-05-29T00:00:00.000Z'
    )
  `).run(
    branchId,
    JSON.stringify(["SCN-1"]),
    JSON.stringify(["SCN-0"]),
    JSON.stringify([{ start_pg: "PG-3", end_pg: "PG-4", pg_ids: ["PG-3", "PG-4"] }]),
    JSON.stringify({ "PG-1": ["SCN-1"], "PG-2": ["SCN-1"] }),
    JSON.stringify([
      {
        scene_id: "SCN-1",
        branch_id: branchId,
        supersedes: null,
        superseded: false,
        pg_ids: ["PG-1", "PG-2"],
        artifact_availability: {
          plan_present: true,
          prose_present: true,
          receipt_present: true,
          receipt_verdict: "PASS",
        },
        publication_indicator: publicationIndicator,
      },
    ]),
  );
}

test("readSceneCoverage returns world-index scene coverage without re-deriving publication state", () => {
  const repoRoot = createTempRepo();
  const db = openIndex(repoRoot, "fixture-world");
  insertFreshnessNode(db, repoRoot);
  insertCoverage(db, "BR-1", "attached:PASS");
  insertCoverage(db, "BR-2", "planned");
  db.close();

  const result = readSceneCoverage(
    { worldSlug: "fixture-world", storySlug: "red-bunny", branchId: "BR-1" },
    repoRoot,
  );

  assert.equal(result.worldIndexStatus.kind, "fresh");
  assert.equal(result.degradedDirectRead, false);
  assert.equal(result.branches.length, 1);
  assert.deepEqual(result.branches[0]?.active_scene_ids, ["SCN-1"]);
  assert.deepEqual(result.branches[0]?.superseded_scene_ids, ["SCN-0"]);
  assert.deepEqual(result.branches[0]?.unscened_runs, [
    { start_pg: "PG-3", end_pg: "PG-4", pg_ids: ["PG-3", "PG-4"] },
  ]);
  assert.deepEqual(result.branches[0]?.pg_scene_lookup, { "PG-1": ["SCN-1"], "PG-2": ["SCN-1"] });
  assert.equal(result.branches[0]?.scenes[0]?.publication_indicator, "attached:PASS");

  const branch = readSceneCoverageBranch(
    { worldSlug: "fixture-world", storySlug: "red-bunny", branchId: "BR-2" },
    repoRoot,
  );
  assert.equal(branch?.branch_id, "BR-2");
  assert.equal(branch?.scenes[0]?.publication_indicator, "planned");
});

test("readSceneCoverage exposes degraded posture instead of fabricating coverage when the index is unavailable", () => {
  const repoRoot = createTempRepo();

  const result = readSceneCoverage(
    { worldSlug: "fixture-world", storySlug: "red-bunny" },
    repoRoot,
  );

  assert.equal(result.worldIndexStatus.kind, "missing");
  assert.equal(result.degradedDirectRead, true);
  assert.deepEqual(result.branches, []);
});
