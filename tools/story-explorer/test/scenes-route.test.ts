import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { openIndex } from "@worldloom/world-index/index/open";
import type Database from "better-sqlite3";
import YAML from "yaml";

import { createServer } from "../src/server/http.js";

interface ScenesFixture {
  repoRoot: string;
  storyRoot: string;
  db: Database.Database;
}

function createScenesFixture(): ScenesFixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-scenes-"));
  const storyRoot = path.join(repoRoot, "worlds", "fixture-world", "stories", "red-bunny");
  mkdirSync(path.join(repoRoot, ".git"));
  for (const subdir of ["pages", "choices", "events", "scenes"]) {
    mkdirSync(path.join(storyRoot, "_source", subdir), { recursive: true });
  }
  for (const subdir of ["scene-prose-plans", "scene-prose", "scene-prose-receipts"]) {
    mkdirSync(path.join(storyRoot, subdir), { recursive: true });
  }
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8",
  );

  return { repoRoot, storyRoot, db: openIndex(repoRoot, "fixture-world") };
}

function writeRecord(fixture: ScenesFixture, sourceDir: string, recordId: string, body: Record<string, unknown>): string {
  const serialized = YAML.stringify(body);
  writeFileSync(path.join(fixture.storyRoot, "_source", sourceDir, `${recordId}.yaml`), serialized, "utf8");
  return serialized;
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
  ).run(nodeId, filePath, nodeType, body);
  db.prepare(
    `
      INSERT INTO file_versions (world_slug, file_path, content_hash, last_indexed_at)
      VALUES ('fixture-world', ?, 'hash', '2026-05-29T00:00:00.000Z')
    `,
  ).run(filePath);
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
    JSON.stringify(["SCN-1", "SCN-2"]),
    JSON.stringify(["SCN-0"]),
    JSON.stringify([]),
    JSON.stringify({ "PG-1": ["SCN-1"], "PG-2": ["SCN-1"], "PG-3": ["SCN-2"] }),
    JSON.stringify([
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
        pg_ids: ["PG-1", "PG-2"],
        artifact_availability: {
          plan_present: true,
          prose_present: true,
          receipt_present: true,
          receipt_verdict: "PASS",
        },
        publication_indicator: "attached:PASS",
      },
      {
        scene_id: "SCN-2",
        branch_id: "BR-1",
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
  );
}

function seedFreshScenesFixture(): string {
  const fixture = createScenesFixture();
  const page1 = writeRecord(fixture, "pages", "PG-1", {
    id: "PG-1",
    story_id: "STORY-1",
    branch_id: "BR-1",
    parent_page_id: null,
    turn_index: 0,
    input: { choice_id: null, manual_action_text: null, resolved_event_id: "SE-1" },
    state_snapshot: { active_records: { STENT: ["STENT-1"] }, continuation: { terminal_status: "open" } },
    emitted_choices: [],
    validation_trace: {},
  });
  const page2 = writeRecord(fixture, "pages", "PG-2", {
    id: "PG-2",
    story_id: "STORY-1",
    branch_id: "BR-1",
    parent_page_id: "PG-1",
    turn_index: 1,
    input: { choice_id: null, manual_action_text: null, resolved_event_id: "SE-2" },
    state_snapshot: { active_records: { STENT: ["STENT-1"], BEL: ["BEL-1"] }, continuation: { terminal_status: "open" } },
    emitted_choices: ["CHC-1"],
    validation_trace: {},
  });
  const page3 = writeRecord(fixture, "pages", "PG-3", {
    id: "PG-3",
    story_id: "STORY-1",
    branch_id: "BR-1",
    parent_page_id: "PG-2",
    turn_index: 2,
    input: { choice_id: "CHC-1", manual_action_text: null, resolved_event_id: null },
    state_snapshot: { active_records: {}, continuation: { terminal_status: "open" } },
    emitted_choices: [],
    validation_trace: {},
  });
  const choice = writeRecord(fixture, "choices", "CHC-1", {
    id: "CHC-1",
    surface_label: "Open the red door",
    player_visible_intent: "Investigate",
    likely_state_pressure: ["secret"],
    grounded_in: ["BEL-1"],
  });
  const event1 = writeRecord(fixture, "events", "SE-1", {
    id: "SE-1",
    state_delta: { create: ["STENT-1"], supersede: [], close: [] },
    record_introductions: [{ record_id: "STENT-1" }],
    state_relations: [],
  });
  const event2 = writeRecord(fixture, "events", "SE-2", {
    id: "SE-2",
    state_delta: { create: ["BEL-1"], supersede: ["STENT-0"], close: [] },
    record_introductions: [{ record_id: "BEL-1" }],
    state_relations: [{ type: "knows" }],
  });
  const scene = writeRecord(fixture, "scenes", "SCN-1", {
    id: "SCN-1",
    story_id: "STORY-1",
    branch_id: "BR-1",
    pg_ids: ["PG-1", "PG-2"],
  });

  insertNode(fixture.db, "red-bunny:PG-1", "stories/red-bunny/_source/pages/PG-1.yaml", "page_record", page1);
  insertNode(fixture.db, "red-bunny:PG-2", "stories/red-bunny/_source/pages/PG-2.yaml", "page_record", page2);
  insertNode(fixture.db, "red-bunny:PG-3", "stories/red-bunny/_source/pages/PG-3.yaml", "page_record", page3);
  insertNode(fixture.db, "red-bunny:CHC-1", "stories/red-bunny/_source/choices/CHC-1.yaml", "choice_record", choice);
  insertNode(fixture.db, "red-bunny:SE-1", "stories/red-bunny/_source/events/SE-1.yaml", "story_event_record", event1);
  insertNode(fixture.db, "red-bunny:SE-2", "stories/red-bunny/_source/events/SE-2.yaml", "story_event_record", event2);
  insertNode(fixture.db, "red-bunny:SCN-1", "stories/red-bunny/_source/scenes/SCN-1.yaml", "scene_record", scene);
  insertCoverage(fixture.db);
  fixture.db.close();

  writeFileSync(path.join(fixture.storyRoot, "scene-prose-plans", "SCN-1.md"), "Scene plan\n", "utf8");
  writeFileSync(path.join(fixture.storyRoot, "scene-prose", "SCN-1.md"), "Scene prose\n", "utf8");
  writeFileSync(
    path.join(fixture.storyRoot, "scene-prose-receipts", "SCN-1.yaml"),
    YAML.stringify({ verdict: "PASS", state_hash: "state-hash" }),
    "utf8",
  );

  return fixture.repoRoot;
}

function seedMissingIndexFixture(): string {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-scenes-missing-index-"));
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

test("scenes route filters active, prose-backed, and receipt-verdict scene summaries", async () => {
  const server = await createServer({ repoRoot: seedFreshScenesFixture() });

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/scenes?coverage=active&hasProse=true&receiptVerdict=PASS",
    });
    const body = JSON.parse(response.body) as {
      _envelope?: { worldIndexStatus?: { kind?: string } };
      data?: {
        degradedDirectRead?: boolean;
        scenes?: Array<{
          sceneId?: string;
          coverageStatus?: string;
          publicationState?: string;
          artifactAvailability?: { prose_present?: boolean; receipt_verdict?: string };
        }>;
      };
    };

    assert.equal(response.statusCode, 200);
    assert.equal(body._envelope?.worldIndexStatus?.kind, "fresh");
    assert.equal(body.data?.degradedDirectRead, false);
    assert.deepEqual(body.data?.scenes?.map((scene) => scene.sceneId), ["SCN-1"]);
    assert.equal(body.data?.scenes?.[0]?.coverageStatus, "active");
    assert.equal(body.data?.scenes?.[0]?.publicationState, "attached:PASS");
    assert.equal(body.data?.scenes?.[0]?.artifactAvailability?.prose_present, true);
    assert.equal(body.data?.scenes?.[0]?.artifactAvailability?.receipt_verdict, "PASS");
  } finally {
    await server.close();
  }
});

test("scene detail returns SCN record, page summaries, choice surface, event deltas, and artifact links", async () => {
  const server = await createServer({ repoRoot: seedFreshScenesFixture() });

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/scenes/SCN-1",
    });
    const body = JSON.parse(response.body) as {
      data?: {
        sceneRecord?: { id?: string };
        pageIds?: string[];
        includedPages?: Array<{ pageId?: string; activeRecordCounts?: Record<string, number>; xrayHref?: string }>;
        endChoiceSurface?: { pageId?: string; emittedChoices?: Array<{ choiceId?: string; surfaceLabel?: string }> } | null;
        eventDeltas?: Array<{ eventId?: string | null; createCount?: number; supersedeCount?: number; relationCount?: number }>;
        artifactAvailability?: { receipt_verdict?: string };
        artifactLinks?: { plan?: string; prose?: string; receipt?: string };
      };
    };

    assert.equal(response.statusCode, 200);
    assert.equal(body.data?.sceneRecord?.id, "SCN-1");
    assert.deepEqual(body.data?.pageIds, ["PG-1", "PG-2"]);
    assert.deepEqual(body.data?.includedPages?.map((page) => page.pageId), ["PG-1", "PG-2"]);
    assert.deepEqual(body.data?.includedPages?.[1]?.activeRecordCounts, { STENT: 1, BEL: 1 });
    assert.equal(body.data?.includedPages?.[1]?.xrayHref, "/api/worlds/fixture-world/stories/red-bunny/state-ticks/PG-2/xray");
    assert.deepEqual(body.data?.endChoiceSurface, {
      pageId: "PG-2",
      emittedChoices: [
        {
          choiceId: "CHC-1",
          surfaceLabel: "Open the red door",
          playerVisibleIntent: "Investigate",
          pressure: ["secret"],
          groundedInCount: 1,
        },
      ],
    });
    assert.deepEqual(body.data?.eventDeltas, [
      { eventId: "SE-1", createCount: 1, supersedeCount: 0, closeCount: 0, introducedRecordIds: ["STENT-1"], relationCount: 0 },
      { eventId: "SE-2", createCount: 1, supersedeCount: 1, closeCount: 0, introducedRecordIds: ["BEL-1"], relationCount: 1 },
    ]);
    assert.equal(body.data?.artifactAvailability?.receipt_verdict, "PASS");
    assert.equal(body.data?.artifactLinks?.prose, "/api/worlds/fixture-world/stories/red-bunny/scenes/SCN-1/prose");
  } finally {
    await server.close();
  }
});

test("scene artifact routes read scene-prose files and report missing files", async () => {
  const server = await createServer({ repoRoot: seedFreshScenesFixture() });

  try {
    const proseResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/scenes/SCN-1/prose",
    });
    const proseBody = JSON.parse(proseResponse.body) as { data?: { kind?: string; body?: string } };
    assert.equal(proseResponse.statusCode, 200);
    assert.equal(proseBody.data?.kind, "prose");
    assert.equal(proseBody.data?.body, "Scene prose\n");

    const receiptResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/scenes/SCN-1/receipt",
    });
    const receiptBody = JSON.parse(receiptResponse.body) as { data?: { body?: { verdict?: string } } };
    assert.equal(receiptResponse.statusCode, 200);
    assert.equal(receiptBody.data?.body?.verdict, "PASS");

    const missingResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/scenes/SCN-2/prose",
    });
    const missingBody = JSON.parse(missingResponse.body) as { data?: { error?: string } };
    assert.equal(missingResponse.statusCode, 404);
    assert.equal(missingBody.data?.error, "not_found");
  } finally {
    await server.close();
  }
});

test("scenes route exposes degraded posture without fabricating scene coverage", async () => {
  const server = await createServer({ repoRoot: seedMissingIndexFixture() });

  try {
    const response = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/scenes",
    });
    const body = JSON.parse(response.body) as {
      _envelope?: { worldIndexStatus?: { kind?: string } };
      data?: { degradedDirectRead?: boolean; scenes?: unknown[]; indexStatus?: { kind?: string } };
    };

    assert.equal(response.statusCode, 200);
    assert.equal(body._envelope?.worldIndexStatus?.kind, "missing");
    assert.equal(body.data?.indexStatus?.kind, "missing");
    assert.equal(body.data?.degradedDirectRead, true);
    assert.deepEqual(body.data?.scenes, []);
  } finally {
    await server.close();
  }
});
