import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { openIndex } from "@worldloom/world-index/index/open";
import type Database from "better-sqlite3";
import YAML from "yaml";

import { createServer } from "../src/server/http.js";
import type { BranchMapGraph } from "../src/view-models/branch-map-graph.js";

const WORLD = "fixture-world";
const STORY = "red-bunny";

interface Fixture {
  repoRoot: string;
  storyRoot: string;
  db: Database.Database;
}

function createFixture(): Fixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-branchmap-"));
  const storyRoot = path.join(repoRoot, "worlds", WORLD, "stories", STORY);
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(storyRoot, "_source", "pages"), { recursive: true });
  writeFileSync(path.join(storyRoot, "STORY_KERNEL.md"), ["---", "story_id: STORY-1", "---", ""].join("\n"), "utf8");
  return { repoRoot, storyRoot, db: openIndex(repoRoot, WORLD) };
}

interface PageSeed {
  id: string;
  branchId: string;
  parentPageId: string | null;
  branchPath: string[];
  turnIndex: number;
  emittedChoices?: string[];
  terminalStatus?: string;
}

function writePage(fixture: Fixture, seed: PageSeed, indexed = true): void {
  const body = {
    id: seed.id,
    story_id: "STORY-1",
    branch_id: seed.branchId,
    parent_page_id: seed.parentPageId,
    branch_path: seed.branchPath,
    turn_index: seed.turnIndex,
    input: { choice_id: null, manual_action_text: null, resolved_event_id: null },
    state_snapshot: { active_records: {}, continuation: { terminal_status: seed.terminalStatus ?? "open" } },
    emitted_choices: seed.emittedChoices ?? [],
    validation_trace: {},
  };
  const serialized = YAML.stringify(body);
  const filePath = `stories/${STORY}/_source/pages/${seed.id}.yaml`;
  writeFileSync(path.join(fixture.storyRoot, "_source", "pages", `${seed.id}.yaml`), serialized, "utf8");
  if (indexed) {
    fixture.db
      .prepare(
        `
          INSERT INTO nodes (
            node_id, world_slug, file_path, heading_path, byte_start, byte_end,
            line_start, line_end, node_type, body, content_hash, anchor_checksum,
            summary, created_at_index_version, story_slug
          ) VALUES (?, '${WORLD}', ?, NULL, 0, 0, 1, 1, 'page_record', ?, 'hash', 'anchor', NULL, 1, '${STORY}')
        `,
      )
      .run(`${STORY}:${seed.id}`, filePath, serialized);
    fixture.db
      .prepare(
        `INSERT INTO file_versions (world_slug, file_path, content_hash, last_indexed_at) VALUES ('${WORLD}', ?, 'hash', '2026-05-29T00:00:00.000Z')`,
      )
      .run(filePath);
  }
}

function insertCoverage(db: Database.Database, branchId: string, row: Record<string, unknown>): void {
  db.prepare(
    `
      INSERT INTO scene_coverage (
        world_slug, story_slug, branch_id, active_scene_ids_json, superseded_scene_ids_json,
        unscened_ranges_json, pg_scene_lookup_json, scenes_json, refreshed_at
      ) VALUES ('${WORLD}', '${STORY}', ?, ?, ?, ?, ?, ?, '2026-05-29T00:00:00.000Z')
    `,
  ).run(
    branchId,
    JSON.stringify(row.active_scene_ids ?? []),
    JSON.stringify(row.superseded_scene_ids ?? []),
    JSON.stringify(row.unscened_ranges ?? []),
    JSON.stringify(row.pg_scene_lookup ?? {}),
    JSON.stringify(row.scenes ?? []),
  );
}

function scene(sceneId: string, pgIds: string[], indicator: string, verdict: "PASS" | "WARN" | "FAIL" | null): Record<string, unknown> {
  return {
    scene_id: sceneId,
    branch_id: "BR-1",
    supersedes: null,
    superseded: false,
    pg_ids: pgIds,
    artifact_availability: { plan_present: true, prose_present: indicator !== "planned", receipt_present: verdict !== null, receipt_verdict: verdict },
    publication_indicator: indicator,
  };
}

// BR-1: SCN-1(PG-1) → split at PG-1 → SCN-2(PG-2, paused). BR-2 forks at PG-1:
// unscened PG-3 with a choice surface, then terminal.
function seedFreshFixture(): string {
  const fixture = createFixture();
  writePage(fixture, { id: "PG-1", branchId: "BR-1", parentPageId: null, branchPath: ["PG-1"], turnIndex: 0 });
  writePage(fixture, { id: "PG-2", branchId: "BR-1", parentPageId: "PG-1", branchPath: ["PG-1", "PG-2"], turnIndex: 1, terminalStatus: "branch_pause" });
  writePage(fixture, { id: "PG-3", branchId: "BR-2", parentPageId: "PG-1", branchPath: ["PG-1", "PG-3"], turnIndex: 1, emittedChoices: ["CHC-1"] });
  insertCoverage(fixture.db, "BR-1", {
    active_scene_ids: ["SCN-1", "SCN-2"],
    pg_scene_lookup: { "PG-1": ["SCN-1"], "PG-2": ["SCN-2"] },
    scenes: [scene("SCN-1", ["PG-1"], "attached:PASS", "PASS"), scene("SCN-2", ["PG-2"], "planned", null)],
  });
  insertCoverage(fixture.db, "BR-2", {
    active_scene_ids: [],
    unscened_ranges: [{ start_pg: "PG-3", end_pg: "PG-3", pg_ids: ["PG-3"] }],
    pg_scene_lookup: { "PG-3": [] },
    scenes: [],
  });
  fixture.db.close();
  return fixture.repoRoot;
}

function seedMissingIndexFixture(): string {
  const fixture = createFixture();
  // Pages on disk but never indexed (the in-memory db is discarded, not the
  // on-disk index file we deliberately do not build).
  writePage(fixture, { id: "PG-1", branchId: "BR-1", parentPageId: null, branchPath: ["PG-1"], turnIndex: 0 }, false);
  fixture.db.close();
  // Recreate a repo root WITHOUT a built index by pointing at a fresh temp dir
  // that only carries the disk page; reuse storyRoot path layout.
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-branchmap-missing-"));
  const storyRoot = path.join(repoRoot, "worlds", WORLD, "stories", STORY);
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(storyRoot, "_source", "pages"), { recursive: true });
  writeFileSync(path.join(storyRoot, "STORY_KERNEL.md"), ["---", "story_id: STORY-1", "---", ""].join("\n"), "utf8");
  writeFileSync(
    path.join(storyRoot, "_source", "pages", "PG-1.yaml"),
    YAML.stringify({ id: "PG-1", story_id: "STORY-1", branch_id: "BR-1", parent_page_id: null, branch_path: ["PG-1"], turn_index: 0, input: {}, state_snapshot: { active_records: {}, continuation: { terminal_status: "open" } }, emitted_choices: [], validation_trace: {} }),
    "utf8",
  );
  return repoRoot;
}

async function runBranchMap(repoRoot: string, querySuffix: string): Promise<{ status: number; envelopeKind: string | null; data: BranchMapGraph }> {
  const server = await createServer({ repoRoot });
  try {
    const response = await server.inject({ method: "GET", url: `/api/worlds/${WORLD}/stories/${STORY}/branch-map?${querySuffix}` });
    const parsed = JSON.parse(response.body) as { _envelope?: { worldIndexStatus?: { kind?: string } }; data: BranchMapGraph };
    return { status: response.statusCode, envelopeKind: parsed._envelope?.worldIndexStatus?.kind ?? null, data: parsed.data };
  } finally {
    await server.close();
  }
}

test("branch-map returns the scene-layer node set with a compressed unscened-run bar", async () => {
  const { status, data } = await runBranchMap(seedFreshFixture(), "focus=PG-1");
  assert.equal(status, 200);
  assert.equal(data.degradedDirectRead, false);
  const kinds = new Set(data.nodes.map((node) => node.kind));
  for (const kind of ["scene", "unscened_run", "branch_split", "choice_surface", "terminal_marker"]) {
    assert.ok(kinds.has(kind as never), `expected a ${kind} node`);
  }
  const unscened = data.nodes.find((node) => node.kind === "unscened_run");
  assert.ok(unscened && unscened.kind === "unscened_run");
  assert.equal(unscened.label, "PG-3..PG-3 · 1 ticks · no SCN · final choices: 1");
  assert.equal(unscened.tickCount, 1);
  assert.equal(unscened.finalChoiceCount, 1);
});

test("branch-map shows sibling branches without forcing cross-branch scene segmentation", async () => {
  const { data } = await runBranchMap(seedFreshFixture(), "focus=BR-1");
  assert.deepEqual([...data.branchIds].sort(), ["BR-1", "BR-2"]);
  // Each scene node stays branch-local (no scene spans more than one branch).
  for (const node of data.nodes) {
    if (node.kind === "scene") {
      assert.equal(node.branchId, "BR-1");
    }
  }
  // A fork edge bridges the BR-1 split to the BR-2 first node.
  assert.ok(data.edges.some((edge) => edge.kind === "fork" && edge.branchId === "BR-2"));
});

test("branch-map focus resolves SCN / CHC ids and marks the focused node", async () => {
  const repoRoot = seedFreshFixture();

  const byScene = await runBranchMap(repoRoot, "focus=SCN-1");
  assert.equal(byScene.data.focus.resolvedBranchId, "BR-1");
  assert.equal(byScene.data.focus.nodeId, "SCN-1");
  assert.ok(byScene.data.nodes.some((node) => node.id === "SCN-1" && node.focused));

  const byChoice = await runBranchMap(repoRoot, "focus=CHC-1");
  assert.equal(byChoice.data.focus.resolvedBranchId, "BR-2");
  assert.ok(byChoice.data.focus.nodeId?.startsWith("chs:"));
});

test("branch-map depth bounds the included branches", async () => {
  const repoRoot = seedFreshFixture();
  const shallow = await runBranchMap(repoRoot, "focus=BR-1&depth=0");
  assert.deepEqual(shallow.data.branchIds, ["BR-1"]);
  assert.equal(shallow.data.depth, 0);
  const deep = await runBranchMap(repoRoot, "focus=BR-1&depth=3");
  assert.deepEqual([...deep.data.branchIds].sort(), ["BR-1", "BR-2"]);
});

test("branch-map degrades rather than fabricating under a missing index", async () => {
  const { status, envelopeKind, data } = await runBranchMap(seedMissingIndexFixture(), "focus=PG-1");
  assert.equal(status, 200);
  assert.equal(envelopeKind, "missing");
  assert.equal(data.indexStatus.kind, "missing");
  assert.equal(data.degradedDirectRead, true);
  assert.deepEqual(data.nodes, []);
  assert.deepEqual(data.edges, []);
  // Focus branch is still resolved honestly from the on-disk page record.
  assert.equal(data.focus.resolvedBranchId, "BR-1");
});

test("branch-map validates focus and depth", async () => {
  const repoRoot = seedFreshFixture();
  assert.equal((await runBranchMap(repoRoot, "")).status, 400);
  assert.equal((await runBranchMap(repoRoot, "focus=nonsense")).status, 400);
  assert.equal((await runBranchMap(repoRoot, "focus=PG-1&depth=11")).status, 400);
  assert.equal((await runBranchMap(repoRoot, "focus=PG-1&depth=bad")).status, 400);
});
