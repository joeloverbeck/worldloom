import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { openIndex } from "@worldloom/world-index/index/open";
import type Database from "better-sqlite3";
import YAML from "yaml";

import { createServer } from "../src/server/http.js";

interface OverviewFixture {
  repoRoot: string;
  storyRoot: string;
  db: Database.Database;
}

function createOverviewFixture(): OverviewFixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-overview-"));
  const storyRoot = path.join(repoRoot, "worlds", "fixture-world", "stories", "red-bunny");
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(storyRoot, "_source", "pages"), { recursive: true });
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8",
  );

  return { repoRoot, storyRoot, db: openIndex(repoRoot, "fixture-world") };
}

function writePage(
  storyRoot: string,
  pageId: string,
  body: {
    branch_id: string;
    parent_page_id: string | null;
    turn_index: number;
    choice_id: string | null;
    emitted_choices: readonly string[];
  },
): string {
  const serialized = YAML.stringify({
    id: pageId,
    story_id: "STORY-1",
    branch_id: body.branch_id,
    parent_page_id: body.parent_page_id,
    turn_index: body.turn_index,
    input: { choice_id: body.choice_id, manual_action_text: null, resolved_event_id: null },
    state_snapshot: { active_records: {}, continuation: { terminal_status: "open" } },
    emitted_choices: body.emitted_choices,
    validation_trace: {},
  });
  writeFileSync(path.join(storyRoot, "_source", "pages", `${pageId}.yaml`), serialized, "utf8");
  return serialized;
}

function insertPageNode(
  db: Database.Database,
  pageId: string,
  filePath: string,
  body: string,
): void {
  db.prepare(
    `
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
        created_at_index_version,
        story_slug
      )
      VALUES (?, 'fixture-world', ?, NULL, 0, 0, 1, 1, 'page_record', ?, 'hash', 'anchor', NULL, 1, 'red-bunny')
    `,
  ).run(`red-bunny:${pageId}`, filePath, body);
  db.prepare(
    `
      INSERT INTO file_versions (world_slug, file_path, content_hash, last_indexed_at)
      VALUES ('fixture-world', ?, 'hash', '2026-05-29T00:00:00.000Z')
    `,
  ).run(filePath);
}

function insertCoverage(db: Database.Database): void {
  const insert = db.prepare(`
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
      @branchId,
      @activeSceneIds,
      @supersededSceneIds,
      @unscenedRanges,
      @pgSceneLookup,
      @scenes,
      '2026-05-29T00:00:00.000Z'
    )
  `);

  insert.run({
    branchId: "BR-1",
    activeSceneIds: JSON.stringify(["SCN-1"]),
    supersededSceneIds: JSON.stringify(["SCN-0"]),
    unscenedRanges: JSON.stringify([{ start_pg: "PG-2", end_pg: "PG-2", pg_ids: ["PG-2"] }]),
    pgSceneLookup: JSON.stringify({ "PG-1": ["SCN-1"] }),
    scenes: JSON.stringify([
      {
        scene_id: "SCN-0",
        branch_id: "BR-1",
        supersedes: null,
        superseded: true,
        pg_ids: ["PG-1"],
        artifact_availability: {
          plan_present: true,
          prose_present: true,
          receipt_present: true,
          receipt_verdict: "WARN",
        },
        publication_indicator: "superseded",
      },
      {
        scene_id: "SCN-1",
        branch_id: "BR-1",
        supersedes: "SCN-0",
        superseded: false,
        pg_ids: ["PG-1"],
        artifact_availability: {
          plan_present: true,
          prose_present: true,
          receipt_present: true,
          receipt_verdict: "PASS",
        },
        publication_indicator: "attached:PASS",
      },
    ]),
  });

  insert.run({
    branchId: "BR-2",
    activeSceneIds: JSON.stringify(["SCN-2"]),
    supersededSceneIds: JSON.stringify([]),
    unscenedRanges: JSON.stringify([]),
    pgSceneLookup: JSON.stringify({ "PG-3": ["SCN-2"] }),
    scenes: JSON.stringify([
      {
        scene_id: "SCN-2",
        branch_id: "BR-2",
        supersedes: null,
        superseded: false,
        pg_ids: ["PG-3"],
        artifact_availability: {
          plan_present: true,
          prose_present: false,
          receipt_present: false,
          receipt_verdict: null,
        },
        publication_indicator: "planned",
      },
    ]),
  });
}

function seedFreshFixture(): string {
  const fixture = createOverviewFixture();
  const pages = [
    ["PG-1", { branch_id: "BR-1", parent_page_id: null, turn_index: 0, choice_id: null, emitted_choices: ["CHC-1"] }],
    ["PG-2", { branch_id: "BR-1", parent_page_id: "PG-1", turn_index: 1, choice_id: "CHC-1", emitted_choices: [] }],
    ["PG-3", { branch_id: "BR-2", parent_page_id: "PG-1", turn_index: 2, choice_id: "CHC-2", emitted_choices: [] }],
  ] as const;

  for (const [pageId, body] of pages) {
    const serialized = writePage(fixture.storyRoot, pageId, body);
    insertPageNode(
      fixture.db,
      pageId,
      `stories/red-bunny/_source/pages/${pageId}.yaml`,
      serialized,
    );
  }
  insertCoverage(fixture.db);
  fixture.db.close();
  return fixture.repoRoot;
}

function seedMissingIndexFixture(): string {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-overview-missing-index-"));
  const storyRoot = path.join(repoRoot, "worlds", "fixture-world", "stories", "red-bunny");
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(storyRoot, "_source", "pages"), { recursive: true });
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8",
  );
  writePage(storyRoot, "PG-1", {
    branch_id: "BR-1",
    parent_page_id: null,
    turn_index: 0,
    choice_id: null,
    emitted_choices: [],
  });
  return repoRoot;
}

test("overview route returns story, branch, coverage, and unscened summaries from scene coverage", async () => {
  const server = await createServer({ repoRoot: seedFreshFixture() });

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/overview",
    });
    const body = JSON.parse(response.body) as {
      _envelope?: { worldIndexStatus?: { kind?: string } };
      data?: {
        title?: string;
        pageCount?: number;
        choiceCount?: number;
        sceneCoverageCounts?: {
          status?: string;
          activeSceneCount?: number;
          supersededSceneCount?: number;
          totalSceneCount?: number;
        };
        unscenedRunCounts?: { status?: string; runCount?: number; pageCount?: number };
        degradedDirectRead?: boolean;
        branches?: Array<{
          branchId?: string;
          rootPageId?: string | null;
          latestPageId?: string | null;
          latestScene?: { sceneId?: string; publicationState?: string } | null;
        }>;
      };
    };

    assert.equal(response.statusCode, 200);
    assert.equal(body._envelope?.worldIndexStatus?.kind, "fresh");
    assert.equal(body.data?.title, "Red Bunny");
    assert.equal(body.data?.pageCount, 3);
    assert.equal(body.data?.choiceCount, 2);
    assert.equal(body.data?.degradedDirectRead, false);
    assert.deepEqual(body.data?.sceneCoverageCounts, {
      status: "available",
      activeSceneCount: 2,
      supersededSceneCount: 1,
      totalSceneCount: 3,
    });
    assert.deepEqual(body.data?.unscenedRunCounts, {
      status: "available",
      runCount: 1,
      pageCount: 1,
    });
    assert.deepEqual(body.data?.branches, [
      {
        branchId: "BR-1",
        rootPageId: "PG-1",
        latestPageId: "PG-2",
        latestScene: { sceneId: "SCN-1", publicationState: "attached:PASS" },
      },
      {
        branchId: "BR-2",
        rootPageId: "PG-3",
        latestPageId: "PG-3",
        latestScene: { sceneId: "SCN-2", publicationState: "planned" },
      },
    ]);
  } finally {
    await server.close();
  }
});

test("overview route reports degraded counts instead of fabricating coverage without an index", async () => {
  const server = await createServer({ repoRoot: seedMissingIndexFixture() });

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/overview",
    });
    const body = JSON.parse(response.body) as {
      _envelope?: { worldIndexStatus?: { kind?: string } };
      data?: {
        degradedDirectRead?: boolean;
        branches?: unknown[];
        sceneCoverageCounts?: {
          status?: string;
          activeSceneCount?: number | null;
          supersededSceneCount?: number | null;
          totalSceneCount?: number | null;
        };
        unscenedRunCounts?: { status?: string; runCount?: number | null; pageCount?: number | null };
      };
    };

    assert.equal(response.statusCode, 200);
    assert.equal(body._envelope?.worldIndexStatus?.kind, "missing");
    assert.equal(body.data?.degradedDirectRead, true);
    assert.deepEqual(body.data?.branches, [
      { branchId: "BR-1", rootPageId: "PG-1", latestPageId: "PG-1", latestScene: null },
    ]);
    assert.deepEqual(body.data?.sceneCoverageCounts, {
      status: "degraded",
      activeSceneCount: null,
      supersededSceneCount: null,
      totalSceneCount: null,
    });
    assert.deepEqual(body.data?.unscenedRunCounts, {
      status: "degraded",
      runCount: null,
      pageCount: null,
    });
  } finally {
    await server.close();
  }
});
