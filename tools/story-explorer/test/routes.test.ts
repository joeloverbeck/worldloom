import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { sha256Hex } from "@worldloom/world-index/hash/content";
import { openIndex } from "@worldloom/world-index/index/open";
import type Database from "better-sqlite3";
import YAML from "yaml";

import { createServer } from "../src/server/http.js";
import { PageDetailNotFoundError } from "../src/read/page-detail.js";
import { pageDetailNotFoundMessage } from "../src/server/routes/pages.js";

interface RouteFixture {
  repoRoot: string;
  storyRoot: string;
  db: Database.Database;
}

function createRouteFixture(): RouteFixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-routes-"));
  const storyRoot = path.join(repoRoot, "worlds", "fixture-world", "stories", "red-bunny");
  mkdirSync(path.join(repoRoot, ".git"));
  for (const subdir of ["pages", "choices", "events", "entities"]) {
    mkdirSync(path.join(storyRoot, "_source", subdir), { recursive: true });
  }
  for (const subdir of ["pages-prose", "pages-prose-plans", "pages-prose-receipts", "storylet-batches", "story-promotions"]) {
    mkdirSync(path.join(storyRoot, subdir), { recursive: true });
  }
  mkdirSync(path.join(storyRoot, "audits", "SAU-1", "remediation-storylet-proposals"), { recursive: true });
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8",
  );
  return { repoRoot, storyRoot, db: openIndex(repoRoot, "fixture-world") };
}

function writeRecord(storyRoot: string, sourceDir: string, recordId: string, body: Record<string, unknown>): string {
  const serialized = YAML.stringify(body);
  writeFileSync(path.join(storyRoot, "_source", sourceDir, `${recordId}.yaml`), serialized, "utf8");
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
      VALUES ('fixture-world', ?, 'hash', '2026-05-26T00:00:00.000Z')
    `,
  ).run(filePath);
}

function insertEdge(db: Database.Database, source: string, target: string, edgeType: string): void {
  db.prepare(
    `
      INSERT INTO edges (source_node_id, target_node_id, target_unresolved_ref, edge_type, story_slug)
      VALUES (?, ?, NULL, ?, 'red-bunny')
    `,
  ).run(source, target, edgeType);
}

function seedFixture(): RouteFixture {
  const fixture = createRouteFixture();
  const rootPage = writeRecord(fixture.storyRoot, "pages", "PG-1", {
    id: "PG-1",
    story_id: "STORY-1",
    branch_id: "BR-1",
    parent_page_id: null,
    branch_path: ["PG-1"],
    turn_index: 0,
    input: { choice_id: null, manual_action_text: null, resolved_event_id: "SE-1" },
    state_snapshot: {
      active_records: { STENT: ["STENT-1"] },
      continuation: { terminal_status: "open", terminal_rationale: null },
    },
    prose_plan_path: "pages-prose-plans/PG-1.md",
    emitted_choices: ["CHC-1"],
    validation_trace: { checks: [{ name: "fixture", verdict: "PASS", rationale: "Fixture route proof." }] },
  });
  const childPage = writeRecord(fixture.storyRoot, "pages", "PG-2", {
    id: "PG-2",
    story_id: "STORY-1",
    branch_id: "BR-2",
    parent_page_id: "PG-1",
    branch_path: ["PG-1", "PG-2"],
    turn_index: 1,
    input: { choice_id: "CHC-1", manual_action_text: null, resolved_event_id: "SE-2" },
    state_snapshot: { active_records: {}, continuation: { terminal_status: "terminal_closed" } },
    emitted_choices: [],
    validation_trace: {},
  });
  writeRecord(fixture.storyRoot, "choices", "CHC-1", {
    id: "CHC-1",
    surface_label: "Follow the thread",
    player_visible_intent: "Investigate",
    likely_state_pressure: ["secret"],
    grounded_in: ["STENT-1"],
  });
  const eventBody = writeRecord(fixture.storyRoot, "events", "SE-1", {
    id: "SE-1",
    event_kind: "npc_action",
    outcome_route: "accept",
    resolution: { player_visible_feedback: "Accepted" },
    state_delta: { create: ["STENT-1"], supersede: [], close: [] },
    record_introductions: [{ record_id: "STENT-1" }],
    state_relations: [],
  });
  const childEventBody = writeRecord(fixture.storyRoot, "events", "SE-2", {
    id: "SE-2",
    outcome_route: "variant",
    commitment: { selected_slt_id: "SLT-1" },
    resolution: { player_visible_feedback: "Variant" },
    state_delta: { create: [], supersede: [], close: [] },
  });
  const entityBody = writeRecord(fixture.storyRoot, "entities", "STENT-1", {
    id: "STENT-1",
    display_name: "Red Bunny",
  });
  const prose = "Rendered prose for PG-1.\n";
  writeFileSync(path.join(fixture.storyRoot, "pages-prose", "PG-1.md"), prose, "utf8");
  writeFileSync(path.join(fixture.storyRoot, "pages-prose-plans", "PG-1.md"), "Plan body\n", "utf8");
  writeFileSync(
    path.join(fixture.storyRoot, "pages-prose-receipts", "PG-1.yaml"),
    YAML.stringify({ verdict: "PASS", state_hash: sha256Hex(prose) }),
    "utf8",
  );
  writeFileSync(
    path.join(fixture.storyRoot, "storylet-batches", "SLB-1.md"),
    ["---", "id: SLB-1", "title: Door pressure move", "status: complete", "---", "Batch body"].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(fixture.storyRoot, "audits", "SAU-1-2026-05-26.md"),
    ["---", "id: SAU-1", "title: Branch audit", "status: complete", "---", "Audit body"].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(fixture.storyRoot, "story-promotions", "SP-1.md"),
    ["---", "id: SP-1", "title: Promote cellar fact", "status: draft", "---", "Promotion body"].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(fixture.storyRoot, "audits", "SAU-1", "remediation-storylet-proposals", "RSP-1-payoff.md"),
    ["---", "id: RSP-1", "title: Clarify payoff", "status: open", "---", "RSP body"].join("\n"),
    "utf8",
  );

  insertNode(fixture.db, "red-bunny:PG-1", "stories/red-bunny/_source/pages/PG-1.yaml", "page_record", rootPage);
  insertNode(fixture.db, "red-bunny:PG-2", "stories/red-bunny/_source/pages/PG-2.yaml", "page_record", childPage);
  insertNode(fixture.db, "red-bunny:SE-1", "stories/red-bunny/_source/events/SE-1.yaml", "story_event_record", eventBody);
  insertNode(fixture.db, "red-bunny:SE-2", "stories/red-bunny/_source/events/SE-2.yaml", "story_event_record", childEventBody);
  insertNode(fixture.db, "red-bunny:STENT-1", "stories/red-bunny/_source/entities/STENT-1.yaml", "story_entity_record", entityBody);
  insertEdge(fixture.db, "red-bunny:SE-1", "red-bunny:STENT-1", "state_delta_create");
  insertEdge(fixture.db, "red-bunny:SE-2", "red-bunny:STENT-1", "state_delta_supersede");
  insertEdge(fixture.db, "red-bunny:STENT-1", "red-bunny:SE-1", "creation_evidence");
  fixture.db.close();
  return fixture;
}

test("page routes return page summaries and PageDetail through the HTTP envelope", async () => {
  const fixture = seedFixture();
  const server = await createServer({ repoRoot: fixture.repoRoot });

  try {
    const listResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/pages?list=1",
    });
    const listBody = JSON.parse(listResponse.body) as { data?: Array<{ pageId?: string }> };
    assert.equal(listResponse.statusCode, 200);
    assert.deepEqual(listBody.data?.map((page) => page.pageId), ["PG-1", "PG-2"]);

    const latestResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/pages?latest=1",
    });
    const latestBody = JSON.parse(latestResponse.body) as { data?: { pageId?: string } };
    assert.equal(latestResponse.statusCode, 200);
    assert.equal(latestBody.data?.pageId, "PG-2");

    const detailResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/pages/PG-1",
    });
    const detailBody = JSON.parse(detailResponse.body) as {
      data?: { proseStatus?: string; choiceNavigation?: Array<{ childOutcomeVariants?: unknown[] }> };
    };
    assert.equal(detailResponse.statusCode, 200);
    assert.equal(detailBody.data?.proseStatus, "present");
    assert.equal(detailBody.data?.choiceNavigation?.[0]?.childOutcomeVariants?.length, 1);
  } finally {
    await server.close();
  }
});

test("page detail route returns 404 only for the typed target-page missing error", async () => {
  const fixture = seedFixture();
  const server = await createServer({ repoRoot: fixture.repoRoot });

  try {
    const missingPageResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/pages/PG-404",
    });
    const missingPageBody = JSON.parse(missingPageResponse.body) as { data?: { error?: string; message?: string } };
    assert.equal(missingPageResponse.statusCode, 404);
    assert.equal(missingPageBody.data?.error, "not_found");
    assert.equal(missingPageBody.data?.message, "Page PG-404 not found in fixture-world/red-bunny");

    assert.equal(
      pageDetailNotFoundMessage(new PageDetailNotFoundError("fixture-world", "red-bunny", "PG-404")),
      "Page PG-404 not found in fixture-world/red-bunny"
    );
    assert.equal(pageDetailNotFoundMessage(new Error("Record not found while resolving page detail")), null);
  } finally {
    await server.close();
  }
});

test("record routes validate all story classes and direct-read markdown classes", async () => {
  const fixture = seedFixture();
  const server = await createServer({ repoRoot: fixture.repoRoot });

  try {
    const validClasses = [
      "PG",
      "SE",
      "BEL",
      "SF",
      "OBL",
      "CNSQ",
      "THR",
      "SREL",
      "STINT",
      "STENT",
      "STSTAT",
      "STCHAR",
      "STLOC",
      "STOBJ",
      "CLK",
      "STSEC",
      "STQ",
      "STPLAN",
      "STEMO",
      "BR",
      "CHC",
      "SLT",
      "DA",
      "SLB",
      "SAU",
      "SP",
      "RSP",
    ];
    for (const klass of validClasses) {
      const response = await server.inject({
        method: "GET",
        url: `/api/worlds/fixture-world/stories/red-bunny/records/${klass}-999`,
      });
      assert.notEqual(response.statusCode, 400, `${klass} should be accepted by record id validation`);
    }

    const invalidResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/records/INVALID-1",
    });
    const invalidBody = JSON.parse(invalidResponse.body) as { data?: { error?: string } };
    assert.equal(invalidResponse.statusCode, 400);
    assert.equal(invalidBody.data?.error, "invalid_input");

    const missingStorySlugResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/records/PG-1",
    });
    const missingStorySlugBody = JSON.parse(missingStorySlugResponse.body) as { data?: { error?: string; field?: string } };
    assert.equal(missingStorySlugResponse.statusCode, 400);
    assert.equal(missingStorySlugBody.data?.error, "invalid_input");
    assert.equal(missingStorySlugBody.data?.field, "storySlug");

    const slbResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/records/SLB-1",
    });
    const slbBody = JSON.parse(slbResponse.body) as { data?: { recordCard?: { summaryLine?: string }; record?: { body?: string } } };
    assert.equal(slbResponse.statusCode, 200);
    assert.equal(slbBody.data?.recordCard?.summaryLine, "Door pressure move");
    assert.equal(slbBody.data?.record?.body, "Batch body");

    const rawResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/records/RSP-1/raw",
    });
    const rawBody = JSON.parse(rawResponse.body) as { data?: { sourcePath?: string; body?: string } };
    assert.equal(rawResponse.statusCode, 200);
    assert.match(rawBody.data?.sourcePath ?? "", /remediation-storylet-proposals\/RSP-1-payoff\.md$/);
    assert.match(rawBody.data?.body ?? "", /RSP body/);
  } finally {
    await server.close();
  }
});

test("prose, plan, receipt, and provenance routes expose direct-read artifacts", async () => {
  const fixture = seedFixture();
  const server = await createServer({ repoRoot: fixture.repoRoot });

  try {
    const proseResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/prose/PG-1",
    });
    const proseBody = JSON.parse(proseResponse.body) as { data?: { status?: string; body?: string } };
    assert.equal(proseResponse.statusCode, 200);
    assert.equal(proseBody.data?.status, "present");
    assert.equal(proseBody.data?.body, "Rendered prose for PG-1.\n");

    const planResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/page-plans/PG-1",
    });
    const planBody = JSON.parse(planResponse.body) as { data?: { body?: string } };
    assert.equal(planResponse.statusCode, 200);
    assert.equal(planBody.data?.body, "Plan body\n");

    const receiptResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/prose-receipts/PG-1",
    });
    const receiptBody = JSON.parse(receiptResponse.body) as { data?: { body?: { verdict?: string } } };
    assert.equal(receiptResponse.statusCode, 200);
    assert.equal(receiptBody.data?.body?.verdict, "PASS");

    const provenanceResponse = await server.inject({
      method: "GET",
      url: "/api/worlds/fixture-world/stories/red-bunny/provenance/STENT-1",
    });
    const provenanceBody = JSON.parse(provenanceResponse.body) as {
      data?: { creatingSeId?: string; modifyingSeIds?: string[]; evidenceRecords?: string[] };
    };
    assert.equal(provenanceResponse.statusCode, 200);
    assert.equal(provenanceBody.data?.creatingSeId, "SE-1");
    assert.deepEqual(provenanceBody.data?.modifyingSeIds, ["SE-2"]);
    assert.deepEqual(provenanceBody.data?.evidenceRecords, ["SE-1"]);
  } finally {
    await server.close();
  }
});
