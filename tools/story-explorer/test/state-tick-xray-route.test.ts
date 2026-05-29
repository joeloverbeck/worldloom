import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { openIndex } from "@worldloom/world-index/index/open";
import type Database from "better-sqlite3";
import YAML from "yaml";

import { createServer } from "../src/server/http.js";

interface XrayFixture {
  repoRoot: string;
  storyRoot: string;
  db: Database.Database;
}

function createXrayFixture(): XrayFixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-xray-"));
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

function writeRecord(fixture: XrayFixture, sourceDir: string, recordId: string, body: Record<string, unknown>): string {
  const serialized = YAML.stringify(body);
  const relativePath = `stories/red-bunny/_source/${sourceDir}/${recordId}.yaml`;
  writeFileSync(path.join(fixture.storyRoot, "_source", sourceDir, `${recordId}.yaml`), serialized, "utf8");
  insertNode(fixture.db, recordId, relativePath, `${recordId.split("-", 1)[0]?.toLowerCase()}_record`, serialized);
  return serialized;
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
    JSON.stringify([{ start_pg: "PG-3", end_pg: "PG-3", pg_ids: ["PG-3"] }]),
    JSON.stringify({ "PG-2": ["SCN-1"], "PG-3": [] }),
    JSON.stringify([
      {
        scene_id: "SCN-1",
        branch_id: "BR-1",
        supersedes: null,
        superseded: false,
        pg_ids: ["PG-1", "PG-2"],
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

function seedFreshXrayFixture(): string {
  const fixture = createXrayFixture();
  writeRecord(fixture, "pages", "PG-2", {
    id: "PG-2",
    story_id: "STORY-1",
    branch_id: "BR-1",
    branch_path: ["PG-1", "PG-2"],
    parent_page_id: "PG-1",
    turn_index: 1,
    input: { choice_id: "CHC-0", manual_action_text: null, resolved_event_id: "SE-2" },
    state_snapshot: {
      state_hash: "state-hash-2",
      parent_state_hash: "state-hash-1",
      active_records: { STENT: ["STENT-1"], BEL: ["BEL-1"] },
      visible_affordances: ["inspect-key"],
      unresolved_mystery_claims: ["M-7"],
      continuation: { terminal_status: "open" },
    },
    emitted_choices: ["CHC-1"],
    validation_trace: { checks: [{ name: "xray", verdict: "PASS", rationale: "Fixture route proof." }] },
  });
  writeRecord(fixture, "pages", "PG-3", {
    id: "PG-3",
    story_id: "STORY-1",
    branch_id: "BR-1",
    branch_path: ["PG-1", "PG-2", "PG-3"],
    parent_page_id: "PG-2",
    turn_index: 2,
    input: { choice_id: "CHC-1", manual_action_text: null, resolved_event_id: null },
    state_snapshot: {
      active_records: {},
      continuation: { terminal_status: "branch_pause" },
    },
    emitted_choices: [],
    validation_trace: {},
  });
  writeRecord(fixture, "events", "SE-2", {
    id: "SE-2",
    state_delta: { create: ["BEL-1"], supersede: ["STENT-0"], close: ["OBL-1"] },
    record_introductions: [{ record_id: "BEL-1" }],
    state_relations: [{ type: "reveals" }],
    resolution: { player_visible_feedback: "The key glints under the mat." },
  });
  writeRecord(fixture, "choices", "CHC-1", {
    id: "CHC-1",
    surface_label: "Lift the mat",
    player_visible_intent: "Search the threshold",
    likely_state_pressure: ["mystery"],
    grounded_in: ["BEL-1"],
  });
  insertCoverage(fixture.db);
  fixture.db.close();
  return fixture.repoRoot;
}

function seedMissingIndexFixture(): string {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-xray-missing-index-"));
  const storyRoot = path.join(repoRoot, "worlds", "fixture-world", "stories", "red-bunny");
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(storyRoot, "_source", "pages"), { recursive: true });
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(storyRoot, "_source", "pages", "PG-2.yaml"),
    YAML.stringify({
      id: "PG-2",
      story_id: "STORY-1",
      branch_id: "BR-1",
      parent_page_id: null,
      turn_index: 0,
      input: { choice_id: null, manual_action_text: null, resolved_event_id: null },
      state_snapshot: { active_records: {}, continuation: { terminal_status: "open" } },
      emitted_choices: [],
      validation_trace: {},
    }),
    "utf8",
  );
  return repoRoot;
}

test("state-tick xray route returns the full technical PG inspection payload", async () => {
  const server = await createServer({ repoRoot: seedFreshXrayFixture() });

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/state-ticks/PG-2/xray",
    });
    const body = JSON.parse(response.body) as {
      _envelope?: { worldIndexStatus?: { kind?: string } };
      data?: Record<string, any>;
    };

    assert.equal(response.statusCode, 200);
    assert.equal(body._envelope?.worldIndexStatus?.kind, "fresh");
    assert.equal(body.data?.pageId, "PG-2");
    assert.equal(body.data?.parentPageId, "PG-1");
    assert.equal(body.data?.branchId, "BR-1");
    assert.deepEqual(body.data?.branchPath, ["PG-1", "PG-2"]);
    assert.equal(body.data?.turnIndex, 1);
    assert.equal(body.data?.inputMode, "choice");
    assert.equal(body.data?.resolvedEventId, "SE-2");
    assert.equal(body.data?.stateHash, "state-hash-2");
    assert.equal(body.data?.parentStateHash, "state-hash-1");
    assert.deepEqual(body.data?.stateSnapshotSummary, {
      activeRecordCounts: { STENT: 1, BEL: 1 },
      continuationStatus: "open",
      unresolvedMysteryClaims: ["M-7"],
    });
    assert.deepEqual(body.data?.activeRecordsByClass, { STENT: ["STENT-1"], BEL: ["BEL-1"] });
    assert.deepEqual(body.data?.visibleAffordances, ["inspect-key"]);
    assert.deepEqual(body.data?.unresolvedMysteryClaims, ["M-7"]);
    assert.equal(body.data?.continuationStatus, "open");
    assert.deepEqual(body.data?.emittedChoices, {
      pageId: "PG-2",
      emittedChoices: [
        {
          choiceId: "CHC-1",
          surfaceLabel: "Lift the mat",
          playerVisibleIntent: "Search the threshold",
          pressure: ["mystery"],
          groundedInCount: 1,
        },
      ],
    });
    assert.deepEqual(body.data?.validationTrace, {
      checks: [{ name: "xray", verdict: "PASS", rationale: "Fixture route proof." }],
    });
    assert.match(body.data?.rawPageYaml?.sourcePath ?? "", /_source\/pages\/PG-2\.yaml$/);
    assert.match(body.data?.rawPageYaml?.body ?? "", /id: PG-2/);
    assert.equal(body.data?.resolvedEvent?.id, "SE-2");
    assert.deepEqual(body.data?.eventDelta, {
      eventId: "SE-2",
      createCount: 1,
      supersedeCount: 1,
      closeCount: 1,
      introducedRecordIds: ["BEL-1"],
      relationCount: 1,
    });
    assert.deepEqual(body.data?.createdRecordIds, ["BEL-1"]);
    assert.deepEqual(body.data?.supersededRecordIds, ["STENT-0"]);
    assert.deepEqual(body.data?.closedRecordIds, ["OBL-1"]);
    assert.deepEqual(body.data?.container, {
      kind: "scene",
      sceneId: "SCN-1",
      startPg: "PG-1",
      endPg: "PG-2",
      pageIds: ["PG-1", "PG-2"],
    });
    assert.equal(body.data?.degradedDirectRead, false);
  } finally {
    await server.close();
  }
});

test("state-tick xray links unscened ticks without inventing a scene", async () => {
  const server = await createServer({ repoRoot: seedFreshXrayFixture() });

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/state-ticks/PG-3/xray",
    });
    const body = JSON.parse(response.body) as { data?: { container?: unknown } };

    assert.equal(response.statusCode, 200);
    assert.deepEqual(body.data?.container, {
      kind: "unscened_range",
      sceneId: null,
      startPg: "PG-3",
      endPg: "PG-3",
      pageIds: ["PG-3"],
    });
  } finally {
    await server.close();
  }
});

test("state-tick xray route degrades index-derived container data without fabricating coverage", async () => {
  const server = await createServer({ repoRoot: seedMissingIndexFixture() });

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/state-ticks/PG-2/xray",
    });
    const body = JSON.parse(response.body) as {
      _envelope?: { worldIndexStatus?: { kind?: string } };
      data?: { degradedDirectRead?: boolean; indexStatus?: { kind?: string }; container?: unknown };
    };

    assert.equal(response.statusCode, 200);
    assert.equal(body._envelope?.worldIndexStatus?.kind, "missing");
    assert.equal(body.data?.indexStatus?.kind, "missing");
    assert.equal(body.data?.degradedDirectRead, true);
    assert.deepEqual(body.data?.container, {
      kind: "unknown",
      sceneId: null,
      startPg: null,
      endPg: null,
      pageIds: [],
    });
  } finally {
    await server.close();
  }
});

test("state-tick xray route validates pg ids and reports missing ticks", async () => {
  const server = await createServer({ repoRoot: seedFreshXrayFixture() });

  try {
    const invalidResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/state-ticks/not-a-pg/xray",
    });
    const invalidBody = JSON.parse(invalidResponse.body) as { data?: { error?: string; field?: string } };
    assert.equal(invalidResponse.statusCode, 400);
    assert.equal(invalidBody.data?.error, "invalid_input");
    assert.equal(invalidBody.data?.field, "pgId");

    const missingResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/state-ticks/PG-404/xray",
    });
    const missingBody = JSON.parse(missingResponse.body) as { data?: { error?: string } };
    assert.equal(missingResponse.statusCode, 404);
    assert.equal(missingBody.data?.error, "not_found");
  } finally {
    await server.close();
  }
});
