import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { openIndex } from "@worldloom/world-index/index/open";
import type Database from "better-sqlite3";
import YAML from "yaml";

import { createServer } from "../src/server/http.js";

interface TimelineFixture {
  repoRoot: string;
  storyRoot: string;
  db: Database.Database;
}

function createTimelineFixture(): TimelineFixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-timeline-"));
  const storyRoot = path.join(repoRoot, "worlds", "fixture-world", "stories", "red-bunny");
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(storyRoot, "_source", "pages"), { recursive: true });
  mkdirSync(path.join(storyRoot, "_source", "choices"), { recursive: true });
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8",
  );

  return { repoRoot, storyRoot, db: openIndex(repoRoot, "fixture-world") };
}

function insertNode(
  db: Database.Database,
  nodeId: string,
  filePath: string,
  nodeType: string,
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
      VALUES (?, 'fixture-world', ?, NULL, 0, 0, 1, 1, ?, ?, 'hash', 'anchor', NULL, 1, 'red-bunny')
    `,
  ).run(`red-bunny:${nodeId}`, filePath, nodeType, body);
  db.prepare(
    `
      INSERT INTO file_versions (world_slug, file_path, content_hash, last_indexed_at)
      VALUES ('fixture-world', ?, 'hash', '2026-05-29T00:00:00.000Z')
    `,
  ).run(filePath);
}

function writePage(
  fixture: TimelineFixture,
  pageId: string,
  body: {
    branch_id: string;
    parent_page_id: string | null;
    branch_path: string[];
    turn_index: number;
    choice_id: string | null;
    emitted_choices: string[];
    terminal_status?: string;
  },
): void {
  const serialized = YAML.stringify({
    id: pageId,
    story_id: "STORY-1",
    branch_id: body.branch_id,
    parent_page_id: body.parent_page_id,
    branch_path: body.branch_path,
    turn_index: body.turn_index,
    input: { choice_id: body.choice_id, manual_action_text: null, resolved_event_id: null },
    state_snapshot: {
      active_records: {},
      continuation: { terminal_status: body.terminal_status ?? "open" },
    },
    emitted_choices: body.emitted_choices,
    validation_trace: {},
  });
  const relativePath = `stories/red-bunny/_source/pages/${pageId}.yaml`;
  writeFileSync(path.join(fixture.storyRoot, "_source", "pages", `${pageId}.yaml`), serialized, "utf8");
  insertNode(fixture.db, pageId, relativePath, "page_record", serialized);
}

function writeChoice(
  fixture: TimelineFixture,
  choiceId: string,
  body: {
    surface_label: string;
    player_visible_intent: string;
    likely_state_pressure: string[];
    grounded_in: string[];
  },
): void {
  const serialized = YAML.stringify({
    id: choiceId,
    story_id: "STORY-1",
    ...body,
  });
  const relativePath = `stories/red-bunny/_source/choices/${choiceId}.yaml`;
  writeFileSync(path.join(fixture.storyRoot, "_source", "choices", `${choiceId}.yaml`), serialized, "utf8");
  insertNode(fixture.db, choiceId, relativePath, "choice_record", serialized);
}

function insertCoverage(db: Database.Database): void {
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
      'BR-1',
      ?,
      ?,
      ?,
      ?,
      ?,
      '2026-05-29T00:00:00.000Z'
    )
  `).run(
    JSON.stringify(["SCN-1"]),
    JSON.stringify([]),
    JSON.stringify([{ start_pg: "PG-2", end_pg: "PG-2", pg_ids: ["PG-2"] }]),
    JSON.stringify({ "PG-1": ["SCN-1"] }),
    JSON.stringify([
      {
        scene_id: "SCN-1",
        branch_id: "BR-1",
        supersedes: null,
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
  );
}

function seedFreshTimelineFixture(): string {
  const fixture = createTimelineFixture();
  writePage(fixture, "PG-1", {
    branch_id: "BR-1",
    parent_page_id: null,
    branch_path: ["PG-1"],
    turn_index: 0,
    choice_id: null,
    emitted_choices: ["CHC-1", "CHC-2"],
  });
  writePage(fixture, "PG-2", {
    branch_id: "BR-1",
    parent_page_id: "PG-1",
    branch_path: ["PG-1", "PG-2"],
    turn_index: 1,
    choice_id: "CHC-1",
    emitted_choices: [],
    terminal_status: "terminal_closed",
  });
  writePage(fixture, "PG-3", {
    branch_id: "BR-2",
    parent_page_id: "PG-1",
    branch_path: ["PG-1", "PG-3"],
    turn_index: 1,
    choice_id: "CHC-2",
    emitted_choices: [],
    terminal_status: "branch_pause",
  });
  writeChoice(fixture, "CHC-1", {
    surface_label: "Open the red door",
    player_visible_intent: "Investigate the pressure",
    likely_state_pressure: ["secret", "obligation"],
    grounded_in: ["BEL-1", "OBL-1"],
  });
  writeChoice(fixture, "CHC-2", {
    surface_label: "Leave",
    player_visible_intent: "Withdraw",
    likely_state_pressure: [],
    grounded_in: [],
  });
  insertCoverage(fixture.db);
  fixture.db.close();
  return fixture.repoRoot;
}

function seedMissingIndexFixture(): string {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-timeline-missing-index-"));
  const storyRoot = path.join(repoRoot, "worlds", "fixture-world", "stories", "red-bunny");
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(storyRoot, "_source", "pages"), { recursive: true });
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8",
  );
  for (const [pageId, body] of [
    [
      "PG-1",
      {
        branch_id: "BR-1",
        parent_page_id: null,
        branch_path: ["PG-1"],
        turn_index: 0,
        choice_id: null,
        emitted_choices: ["CHC-1"],
      },
    ],
    [
      "PG-2",
      {
        branch_id: "BR-1",
        parent_page_id: "PG-1",
        branch_path: ["PG-1", "PG-2"],
        turn_index: 1,
        choice_id: "CHC-1",
        emitted_choices: [],
      },
    ],
  ] as const) {
    const serialized = YAML.stringify({
      id: pageId,
      story_id: "STORY-1",
      ...body,
      input: { choice_id: body.choice_id, manual_action_text: null, resolved_event_id: null },
      state_snapshot: { active_records: {}, continuation: { terminal_status: "open" } },
      validation_trace: {},
    });
    writeFileSync(path.join(storyRoot, "_source", "pages", `${pageId}.yaml`), serialized, "utf8");
  }
  return repoRoot;
}

test("timeline route returns ordered scene, choice, split, unscened, and terminal segments", async () => {
  const server = await createServer({ repoRoot: seedFreshTimelineFixture() });

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/timeline?branchId=BR-1&focus=PG-2",
    });
    const body = JSON.parse(response.body) as {
      _envelope?: { worldIndexStatus?: { kind?: string } };
      data?: {
        branchId?: string;
        degradedDirectRead?: boolean;
        focus?: { requested?: string; segmentIndex?: number | null; pageId?: string | null };
        segments?: Array<Record<string, unknown>>;
      };
    };

    assert.equal(response.statusCode, 200);
    assert.equal(body._envelope?.worldIndexStatus?.kind, "fresh");
    assert.equal(body.data?.branchId, "BR-1");
    assert.equal(body.data?.degradedDirectRead, false);
    assert.equal(body.data?.focus?.requested, "PG-2");
    assert.equal(body.data?.focus?.segmentIndex, 3);
    assert.deepEqual(body.data?.segments?.map((segment) => segment.kind), [
      "scene_segment",
      "choice_surface",
      "branch_split",
      "unscened_run",
      "terminal_marker",
    ]);
    assert.deepEqual(body.data?.segments?.[0], {
      kind: "scene_segment",
      sceneId: "SCN-1",
      pageIds: ["PG-1"],
      startPageId: "PG-1",
      endPageId: "PG-1",
      publicationState: "attached:PASS",
      focused: false,
    });
    assert.deepEqual(body.data?.segments?.[1], {
      kind: "choice_surface",
      pageId: "PG-1",
      choiceSurface: {
        pageId: "PG-1",
        emittedChoices: [
          {
            choiceId: "CHC-1",
            surfaceLabel: "Open the red door",
            playerVisibleIntent: "Investigate the pressure",
            pressure: ["secret", "obligation"],
            groundedInCount: 2,
          },
          {
            choiceId: "CHC-2",
            surfaceLabel: "Leave",
            playerVisibleIntent: "Withdraw",
            pressure: [],
            groundedInCount: 0,
          },
        ],
      },
      focused: false,
    });
    assert.deepEqual(body.data?.segments?.[2], {
      kind: "branch_split",
      pageId: "PG-1",
      childBranchIds: ["BR-1", "BR-2"],
      focused: false,
    });
    assert.deepEqual(body.data?.segments?.[3], {
      kind: "unscened_run",
      pageIds: ["PG-2"],
      startPageId: "PG-2",
      endPageId: "PG-2",
      focused: true,
    });
    assert.deepEqual(body.data?.segments?.[4], {
      kind: "terminal_marker",
      pageId: "PG-2",
      reason: "terminal",
      focused: true,
    });
  } finally {
    await server.close();
  }
});

test("timeline route degrades without fabricating scene or unscened coverage", async () => {
  const server = await createServer({ repoRoot: seedMissingIndexFixture() });

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/timeline?branchId=BR-1",
    });
    const body = JSON.parse(response.body) as {
      _envelope?: { worldIndexStatus?: { kind?: string } };
      data?: { degradedDirectRead?: boolean; segments?: Array<{ kind?: string }> };
    };

    assert.equal(response.statusCode, 200);
    assert.equal(body._envelope?.worldIndexStatus?.kind, "missing");
    assert.equal(body.data?.degradedDirectRead, true);
    assert.deepEqual(body.data?.segments?.map((segment) => segment.kind), ["choice_surface", "terminal_marker"]);
  } finally {
    await server.close();
  }
});
