import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { openIndex } from "@worldloom/world-index/index/open";
import type Database from "better-sqlite3";
import YAML from "yaml";

import { createServer } from "../src/server/http.js";

interface UnscenedFixture {
  repoRoot: string;
  storyRoot: string;
  db: Database.Database;
}

function createUnscenedFixture(): UnscenedFixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-unscened-"));
  const storyRoot = path.join(repoRoot, "worlds", "fixture-world", "stories", "red-bunny");
  mkdirSync(path.join(repoRoot, ".git"));
  for (const subdir of ["pages", "choices", "events"]) {
    mkdirSync(path.join(storyRoot, "_source", subdir), { recursive: true });
  }
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8",
  );

  return { repoRoot, storyRoot, db: openIndex(repoRoot, "fixture-world") };
}

function insertNode(db: Database.Database, nodeId: string, filePath: string, nodeType: string, body: string): void {
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

function writeRecord(fixture: UnscenedFixture, sourceDir: string, recordId: string, body: Record<string, unknown>): void {
  const serialized = YAML.stringify(body);
  const relativePath = `stories/red-bunny/_source/${sourceDir}/${recordId}.yaml`;
  writeFileSync(path.join(fixture.storyRoot, "_source", sourceDir, `${recordId}.yaml`), serialized, "utf8");
  insertNode(fixture.db, recordId, relativePath, `${recordId.split("-", 1)[0]?.toLowerCase()}_record`, serialized);
}

function writePage(
  fixture: UnscenedFixture,
  pageId: string,
  body: {
    parent_page_id: string | null;
    turn_index: number;
    resolved_event_id: string | null;
    active_records: Record<string, string[]>;
    emitted_choices: string[];
    validation_trace: Record<string, unknown>;
  },
): void {
  writeRecord(fixture, "pages", pageId, {
    id: pageId,
    story_id: "STORY-1",
    branch_id: "BR-1",
    parent_page_id: body.parent_page_id,
    branch_path: body.parent_page_id === null ? [pageId] : ["PG-1", pageId],
    turn_index: body.turn_index,
    input: { choice_id: null, manual_action_text: null, resolved_event_id: body.resolved_event_id },
    state_snapshot: {
      active_records: body.active_records,
      continuation: { terminal_status: "open" },
    },
    emitted_choices: body.emitted_choices,
    validation_trace: body.validation_trace,
  });
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
    JSON.stringify([{ start_pg: "PG-2", end_pg: "PG-3", pg_ids: ["PG-2", "PG-3"] }]),
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

function seedFreshUnscenedFixture(): string {
  const fixture = createUnscenedFixture();
  writePage(fixture, "PG-1", {
    parent_page_id: null,
    turn_index: 0,
    resolved_event_id: "SE-1",
    active_records: { STENT: ["STENT-1"] },
    emitted_choices: [],
    validation_trace: { checks: [{ verdict: "PASS", rationale: "Fixture proof." }] },
  });
  writePage(fixture, "PG-2", {
    parent_page_id: "PG-1",
    turn_index: 1,
    resolved_event_id: "SE-2",
    active_records: { STENT: ["STENT-1"], BEL: ["BEL-1"] },
    emitted_choices: [],
    validation_trace: { checks: [{ verdict: "PASS", rationale: "Fixture proof." }] },
  });
  writePage(fixture, "PG-3", {
    parent_page_id: "PG-2",
    turn_index: 2,
    resolved_event_id: "SE-3",
    active_records: { BEL: ["BEL-1"], OBL: ["OBL-1"] },
    emitted_choices: ["CHC-1"],
    validation_trace: {},
  });
  writeRecord(fixture, "events", "SE-1", {
    id: "SE-1",
    state_delta: { create: ["STENT-1"], supersede: [], close: [] },
    record_introductions: [{ record_id: "STENT-1" }],
    state_relations: [],
  });
  writeRecord(fixture, "events", "SE-2", {
    id: "SE-2",
    state_delta: { create: ["BEL-1"], supersede: [], close: [] },
    record_introductions: [{ record_id: "BEL-1" }],
    state_relations: [],
  });
  writeRecord(fixture, "events", "SE-3", {
    id: "SE-3",
    state_delta: { create: ["OBL-1"], supersede: ["STENT-1"], close: [] },
    record_introductions: [{ record_id: "OBL-1" }],
    state_relations: [{ type: "creates_pressure" }],
  });
  writeRecord(fixture, "choices", "CHC-1", {
    id: "CHC-1",
    surface_label: "Follow the unscened clue",
    player_visible_intent: "Keep investigating",
    likely_state_pressure: ["obligation"],
    grounded_in: ["OBL-1"],
  });
  insertCoverage(fixture.db);
  fixture.db.close();
  return fixture.repoRoot;
}

function seedMissingIndexFixture(): string {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-unscened-missing-index-"));
  const storyRoot = path.join(repoRoot, "worlds", "fixture-world", "stories", "red-bunny");
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(storyRoot, "_source", "pages"), { recursive: true });
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8",
  );
  return repoRoot;
}

test("unscened-ranges route returns coverage-derived runs with enrichment and hint labels", async () => {
  const server = await createServer({ repoRoot: seedFreshUnscenedFixture() });

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/unscened-ranges?branchId=BR-1",
    });
    const body = JSON.parse(response.body) as {
      _envelope?: { worldIndexStatus?: { kind?: string } };
      data?: {
        branchId?: string;
        degradedDirectRead?: boolean;
        ranges?: Array<Record<string, unknown>>;
      };
    };

    assert.equal(response.statusCode, 200);
    assert.equal(body._envelope?.worldIndexStatus?.kind, "fresh");
    assert.equal(body.data?.branchId, "BR-1");
    assert.equal(body.data?.degradedDirectRead, false);
    assert.deepEqual(body.data?.ranges, [
      {
        startPg: "PG-2",
        endPg: "PG-3",
        pageIds: ["PG-2", "PG-3"],
        count: 2,
        finalChoiceSurface: {
          pageId: "PG-3",
          emittedChoices: [
            {
              choiceId: "CHC-1",
              surfaceLabel: "Follow the unscened clue",
              playerVisibleIntent: "Keep investigating",
              pressure: ["obligation"],
              groundedInCount: 1,
            },
          ],
        },
        eventDelta: {
          eventId: "SE-3",
          createCount: 1,
          supersedeCount: 1,
          closeCount: 0,
          introducedRecordIds: ["OBL-1"],
          relationCount: 1,
        },
        activeRecordDelta: {
          startActiveRecordCounts: { STENT: 1, BEL: 1 },
          endActiveRecordCounts: { BEL: 1, OBL: 1 },
          createdRecordIds: ["BEL-1", "OBL-1"],
          supersededRecordIds: ["STENT-1"],
          closedRecordIds: [],
        },
        validationStatus: {
          pageCount: 2,
          pagesWithValidationTrace: 1,
          verdict: "missing",
        },
        suggestedRangeLabel: "Unscened run PG-2 to PG-3",
      },
    ]);
    assert.equal("sceneBoundaryVerdict" in (body.data?.ranges?.[0] ?? {}), false);
  } finally {
    await server.close();
  }
});

test("unscened-ranges route exposes degraded posture without fabricating coverage", async () => {
  const server = await createServer({ repoRoot: seedMissingIndexFixture() });

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/unscened-ranges?branchId=BR-1",
    });
    const body = JSON.parse(response.body) as {
      _envelope?: { worldIndexStatus?: { kind?: string } };
      data?: { degradedDirectRead?: boolean; ranges?: unknown[]; indexStatus?: { kind?: string } };
    };

    assert.equal(response.statusCode, 200);
    assert.equal(body._envelope?.worldIndexStatus?.kind, "missing");
    assert.equal(body.data?.indexStatus?.kind, "missing");
    assert.equal(body.data?.degradedDirectRead, true);
    assert.deepEqual(body.data?.ranges, []);
  } finally {
    await server.close();
  }
});

test("unscened-ranges route validates branch ids", async () => {
  const server = await createServer({ repoRoot: seedFreshUnscenedFixture() });

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/unscened-ranges?branchId=bad",
    });
    const body = JSON.parse(response.body) as { data?: { error?: string; field?: string } };

    assert.equal(response.statusCode, 400);
    assert.equal(body.data?.error, "invalid_input");
    assert.equal(body.data?.field, "branchId");
  } finally {
    await server.close();
  }
});
