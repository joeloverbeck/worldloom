import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { sha256Hex } from "@worldloom/world-index/hash/content";
import { openIndex } from "@worldloom/world-index/index/open";
import type Database from "better-sqlite3";
import YAML from "yaml";

import { createServer } from "../src/server/http.js";

interface CapstoneFixture {
  repoRoot: string;
  storyRoot: string;
  db: Database.Database;
}

interface Enveloped<T> {
  _envelope?: {
    requestId?: string;
    serverVersion?: string;
    worldIndexStatus?: { kind?: string } | null;
  };
  data?: T;
}

function createFixture(): CapstoneFixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-capstone-"));
  const storyRoot = path.join(repoRoot, "worlds", "erotica-world", "stories", "red-bunny");
  mkdirSync(path.join(repoRoot, ".git"));
  for (const subdir of ["pages", "choices", "events", "entities"]) {
    mkdirSync(path.join(storyRoot, "_source", subdir), { recursive: true });
  }
  for (const subdir of ["pages-prose", "pages-prose-plans", "pages-prose-receipts"]) {
    mkdirSync(path.join(storyRoot, subdir), { recursive: true });
  }
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8",
  );
  return { repoRoot, storyRoot, db: openIndex(repoRoot, "erotica-world") };
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
      VALUES (?, 'erotica-world', ?, NULL, 0, 0, 1, 1, ?, ?, 'hash', 'anchor', NULL, 1, 'red-bunny')
    `,
  ).run(nodeId, filePath, nodeType, body);
  db.prepare(
    `
      INSERT INTO file_versions (world_slug, file_path, content_hash, last_indexed_at)
      VALUES ('erotica-world', ?, 'hash', '2026-05-26T00:00:00.000Z')
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

function seedFixture(): CapstoneFixture {
  const fixture = createFixture();
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
    validation_trace: { checks: [{ name: "capstone", verdict: "PASS", rationale: "Fixture route proof." }] },
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
  const choice = writeRecord(fixture.storyRoot, "choices", "CHC-1", {
    id: "CHC-1",
    surface_label: "Follow the thread",
    player_visible_intent: "Investigate the red door",
    likely_state_pressure: ["secret"],
    grounded_in: ["STENT-1"],
  });
  const event = writeRecord(fixture.storyRoot, "events", "SE-1", {
    id: "SE-1",
    event_kind: "npc_action",
    outcome_route: "accept",
    resolution: { player_visible_feedback: "Accepted" },
    state_delta: { create: ["STENT-1"], supersede: [], close: [] },
    record_introductions: [{ record_id: "STENT-1" }],
    state_relations: [],
  });
  const childEvent = writeRecord(fixture.storyRoot, "events", "SE-2", {
    id: "SE-2",
    outcome_route: "variant",
    commitment: { selected_slt_id: "SLT-1" },
    resolution: { player_visible_feedback: "Variant" },
    state_delta: { create: [], supersede: ["STENT-1"], close: [] },
  });
  const entity = writeRecord(fixture.storyRoot, "entities", "STENT-1", {
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

  insertNode(fixture.db, "red-bunny:PG-1", "stories/red-bunny/_source/pages/PG-1.yaml", "page_record", rootPage);
  insertNode(fixture.db, "red-bunny:PG-2", "stories/red-bunny/_source/pages/PG-2.yaml", "page_record", childPage);
  insertNode(fixture.db, "red-bunny:CHC-1", "stories/red-bunny/_source/choices/CHC-1.yaml", "choice_record", choice);
  insertNode(fixture.db, "red-bunny:SE-1", "stories/red-bunny/_source/events/SE-1.yaml", "story_event_record", event);
  insertNode(fixture.db, "red-bunny:SE-2", "stories/red-bunny/_source/events/SE-2.yaml", "story_event_record", childEvent);
  insertNode(fixture.db, "red-bunny:STENT-1", "stories/red-bunny/_source/entities/STENT-1.yaml", "story_entity_record", entity);
  insertEdge(fixture.db, "red-bunny:SE-1", "red-bunny:STENT-1", "state_delta_create");
  insertEdge(fixture.db, "red-bunny:SE-2", "red-bunny:STENT-1", "state_delta_supersede");
  insertEdge(fixture.db, "red-bunny:STENT-1", "red-bunny:SE-1", "creation_evidence");
  fixture.db.close();
  return fixture;
}

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(entryPath);
    }
    return entryPath.endsWith(".yaml") ? [entryPath] : [];
  }).sort();
}

function sourceHashes(sourceRoot: string): Map<string, string> {
  return new Map(
    sourceFiles(sourceRoot).map((sourcePath) => [
      path.relative(sourceRoot, sourcePath),
      sha256Hex(readFileSync(sourcePath, "utf8")),
    ]),
  );
}

function assertEnvelope<T>(
  body: string,
  worldStatusKind: string | null,
): Enveloped<T> {
  const parsed = JSON.parse(body) as Enveloped<T>;
  assert.equal(typeof parsed._envelope?.requestId, "string");
  assert.equal(parsed._envelope?.serverVersion, "0.1.0");
  if (worldStatusKind === null) {
    assert.equal(parsed._envelope?.worldIndexStatus, null);
  } else {
    assert.equal(parsed._envelope?.worldIndexStatus?.kind, worldStatusKind);
  }
  return parsed;
}

test("capstone smoke covers every SPEC-87 route family without mutating fixture source", async () => {
  const fixture = seedFixture();
  const sourceRoot = path.join(fixture.storyRoot, "_source");
  const beforeHashes = sourceHashes(sourceRoot);
  const canonicalRedBunny = path.resolve(process.cwd(), "..", "..", "worlds", "erotica-world", "stories", "red-bunny");
  assert.notEqual(path.resolve(fixture.storyRoot), canonicalRedBunny);
  const server = await createServer({ repoRoot: fixture.repoRoot });

  try {
    const health = await server.inject({ method: "GET", url: "/api/health" });
    assert.equal(health.statusCode, 200);
    assert.equal(assertEnvelope<{ ok?: boolean }>(health.body, null).data?.ok, true);

    const worlds = await server.inject({ method: "GET", url: "/api/worlds" });
    assert.equal(worlds.statusCode, 200);
    const worldsBody = assertEnvelope<Array<{ worldSlug?: string; indexStatus?: { kind?: string } }>>(worlds.body, null);
    assert.equal(worldsBody.data?.[0]?.worldSlug, "erotica-world");
    assert.equal(worldsBody.data?.[0]?.indexStatus?.kind, "fresh");

    const world = await server.inject({ method: "GET", url: "/api/worlds/erotica-world" });
    assert.equal(world.statusCode, 200);
    assert.equal(assertEnvelope<{ worldSlug?: string }>(world.body, "fresh").data?.worldSlug, "erotica-world");

    const stories = await server.inject({ method: "GET", url: "/api/worlds/erotica-world/stories" });
    assert.equal(stories.statusCode, 200);
    const storiesBody = assertEnvelope<Array<{ storySlug?: string; pageCount?: number }>>(stories.body, "fresh");
    assert.equal(storiesBody.data?.[0]?.storySlug, "red-bunny");
    assert.equal(storiesBody.data?.[0]?.pageCount, 2);

    const story = await server.inject({ method: "GET", url: "/api/worlds/erotica-world/stories/red-bunny" });
    assert.equal(story.statusCode, 200);
    assert.equal(assertEnvelope<{ storySlug?: string }>(story.body, "fresh").data?.storySlug, "red-bunny");

    const pages = await server.inject({ method: "GET", url: "/api/worlds/erotica-world/stories/red-bunny/pages?list=1" });
    assert.equal(pages.statusCode, 200);
    assert.deepEqual(assertEnvelope<Array<{ pageId?: string }>>(pages.body, "fresh").data?.map((page) => page.pageId), ["PG-1", "PG-2"]);

    const pageDetail = await server.inject({ method: "GET", url: "/api/worlds/erotica-world/stories/red-bunny/pages/PG-1" });
    assert.equal(pageDetail.statusCode, 200);
    const pageDetailBody = assertEnvelope<{
      proseStatus?: string;
      pagePlanSummary?: { body?: string };
      receiptSummary?: { verdict?: string };
      choiceNavigation?: Array<{ childOutcomeVariants?: unknown[] }>;
      currentStateRecordIds?: string[];
    }>(pageDetail.body, "fresh");
    assert.equal(pageDetailBody.data?.proseStatus, "present");
    assert.equal(pageDetailBody.data?.pagePlanSummary?.body, "Plan body\n");
    assert.equal(pageDetailBody.data?.receiptSummary?.verdict, "PASS");
    assert.equal(pageDetailBody.data?.choiceNavigation?.[0]?.childOutcomeVariants?.length, 1);
    assert.deepEqual(pageDetailBody.data?.currentStateRecordIds, ["STENT-1"]);

    const record = await server.inject({ method: "GET", url: "/api/worlds/erotica-world/stories/red-bunny/records/PG-1" });
    assert.equal(record.statusCode, 200);
    const recordBody = assertEnvelope<{ record?: { id?: string }; recordCard?: { summaryLine?: string } }>(record.body, "fresh");
    assert.equal(recordBody.data?.record?.id, "PG-1");
    assert.equal(recordBody.data?.recordCard?.summaryLine, "PG-1");

    const rawRecord = await server.inject({ method: "GET", url: "/api/worlds/erotica-world/stories/red-bunny/records/PG-1/raw" });
    assert.equal(rawRecord.statusCode, 200);
    assert.match(assertEnvelope<{ body?: string }>(rawRecord.body, "fresh").data?.body ?? "", /id: PG-1/);

    const prose = await server.inject({ method: "GET", url: "/api/worlds/erotica-world/stories/red-bunny/prose/PG-1" });
    assert.equal(prose.statusCode, 200);
    assert.equal(assertEnvelope<{ status?: string; body?: string }>(prose.body, "fresh").data?.body, "Rendered prose for PG-1.\n");

    const plan = await server.inject({ method: "GET", url: "/api/worlds/erotica-world/stories/red-bunny/page-plans/PG-1" });
    assert.equal(plan.statusCode, 200);
    assert.equal(assertEnvelope<{ body?: string }>(plan.body, "fresh").data?.body, "Plan body\n");

    const receipt = await server.inject({ method: "GET", url: "/api/worlds/erotica-world/stories/red-bunny/prose-receipts/PG-1" });
    assert.equal(receipt.statusCode, 200);
    assert.equal(assertEnvelope<{ body?: { verdict?: string } }>(receipt.body, "fresh").data?.body?.verdict, "PASS");

    const provenance = await server.inject({ method: "GET", url: "/api/worlds/erotica-world/stories/red-bunny/provenance/STENT-1" });
    assert.equal(provenance.statusCode, 200);
    const provenanceBody = assertEnvelope<{ creatingSeId?: string; modifyingSeIds?: string[]; evidenceRecords?: string[] }>(
      provenance.body,
      "fresh",
    );
    assert.equal(provenanceBody.data?.creatingSeId, "SE-1");
    assert.deepEqual(provenanceBody.data?.modifyingSeIds, ["SE-2"]);
    assert.deepEqual(provenanceBody.data?.evidenceRecords, ["SE-1"]);

    const search = await server.inject({ method: "GET", url: "/api/worlds/erotica-world/stories/red-bunny/search?q=test" });
    assert.equal(search.statusCode, 200);
    assert.equal(assertEnvelope<{ kind?: string; spec?: string }>(search.body, "fresh").data?.kind, "not_implemented");

    const branchMap = await server.inject({ method: "GET", url: "/api/worlds/erotica-world/stories/red-bunny/branch-map?focus=PG-1" });
    assert.equal(branchMap.statusCode, 200);
    assert.equal(assertEnvelope<{ kind?: string; spec?: string }>(branchMap.body, "fresh").data?.spec, "SPEC-90");

    assert.deepEqual(sourceHashes(sourceRoot), beforeHashes);
    assert.notEqual(path.resolve(fixture.storyRoot), canonicalRedBunny);
  } finally {
    await server.close();
    rmSync(fixture.repoRoot, { recursive: true, force: true });
  }
});
