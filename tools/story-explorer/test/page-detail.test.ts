import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { sha256Hex } from "@worldloom/world-index/hash/content";
import { openIndex } from "@worldloom/world-index/index/open";
import Database from "better-sqlite3";
import YAML from "yaml";

import { getPageDetail } from "../src/read/page-detail.js";
import { getRecordProvenance } from "../src/read/provenance.js";

interface Fixture {
  repoRoot: string;
  storyRoot: string;
  db: Database.Database;
}

function createFixture(): Fixture {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-page-detail-"));
  const storyRoot = path.join(repoRoot, "worlds", "fixture-world", "stories", "red-bunny");
  mkdirSync(path.join(repoRoot, ".git"));
  for (const subdir of ["pages", "choices", "events", "entities"]) {
    mkdirSync(path.join(storyRoot, "_source", subdir), { recursive: true });
  }
  mkdirSync(path.join(storyRoot, "pages-prose"), { recursive: true });
  mkdirSync(path.join(storyRoot, "pages-prose-plans"), { recursive: true });
  mkdirSync(path.join(storyRoot, "pages-prose-receipts"), { recursive: true });
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8"
  );
  return { repoRoot, storyRoot, db: openIndex(repoRoot, "fixture-world") };
}

function writeRecord(storyRoot: string, sourceDir: string, recordId: string, body: Record<string, unknown>): string {
  const serialized = YAML.stringify(body);
  writeFileSync(path.join(storyRoot, "_source", sourceDir, `${recordId}.yaml`), serialized, "utf8");
  return serialized;
}

function pageRecord(args: {
  id: string;
  parentPageId?: string | null;
  turnIndex?: number;
  choiceId?: string | null;
  resolvedEventId: string;
  emittedChoices?: string[];
}): Record<string, unknown> {
  return {
    id: args.id,
    story_id: "STORY-1",
    branch_id: args.id === "PG-1" ? "BR-1" : `BR-${args.turnIndex ?? 1}`,
    parent_page_id: args.parentPageId ?? null,
    branch_path: args.parentPageId === undefined || args.parentPageId === null ? [args.id] : [args.parentPageId, args.id],
    turn_index: args.turnIndex ?? 0,
    input: {
      choice_id: args.choiceId ?? null,
      manual_action_text: null,
      resolved_event_id: args.resolvedEventId,
    },
    state_snapshot: {
      active_records: {
        STENT: ["STENT-1"],
      },
      continuation: {
        terminal_status: "open",
        terminal_rationale: null,
      },
    },
    prose_plan_path: `pages-prose-plans/${args.id}.md`,
    emitted_choices: args.emittedChoices ?? [],
    validation_trace: {
      checks: [{ name: "fixture", verdict: "PASS", rationale: "Fixture exercises PageDetail shape." }],
    },
  };
}

function eventRecord(id: string, outcomeRoute: string, targetRecord: string): Record<string, unknown> {
  return {
    id,
    story_id: "STORY-1",
    created_at_page: "PG-1",
    parent_page_id: "PG-1",
    commitment: {
      selected_slt_id: "SLT-1",
      selection_source: "fixture",
      alias_bindings: [],
    },
    outcome_route: outcomeRoute,
    resolution: {
      result: `${outcomeRoute} result`,
      player_visible_feedback: `${outcomeRoute} preview`,
    },
    record_introductions: [{ record_id: targetRecord }],
    state_relations: [{ relation: "fixture", source: id, target: targetRecord }],
    state_delta: {
      create: [targetRecord],
      supersede: [],
      close: [],
    },
  };
}

function insertPageNode(db: Database.Database, pageId: string, body: string): void {
  insertNode(db, `red-bunny:${pageId}`, `stories/red-bunny/_source/pages/${pageId}.yaml`, "page_record", body);
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
    `
  ).run(nodeId, filePath, nodeType, body);
  db.prepare(
    `
      INSERT INTO file_versions (world_slug, file_path, content_hash, last_indexed_at)
      VALUES ('fixture-world', ?, 'hash', '2026-05-26T00:00:00.000Z')
    `
  ).run(filePath);
}

function insertEdge(db: Database.Database, source: string, target: string, edgeType: string): void {
  db.prepare(
    `
      INSERT INTO edges (source_node_id, target_node_id, target_unresolved_ref, edge_type, story_slug)
      VALUES (?, ?, NULL, ?, 'red-bunny')
    `
  ).run(source, target, edgeType);
}

function seedPageDetailFixture(): Fixture {
  const fixture = createFixture();
  const root = writeRecord(fixture.storyRoot, "pages", "PG-1", pageRecord({ id: "PG-1", resolvedEventId: "SE-1", emittedChoices: ["CHC-1"] }));
  const childPages = [
    pageRecord({ id: "PG-2", parentPageId: "PG-1", turnIndex: 1, choiceId: "CHC-1", resolvedEventId: "SE-2" }),
    pageRecord({ id: "PG-3", parentPageId: "PG-1", turnIndex: 2, choiceId: "CHC-1", resolvedEventId: "SE-3" }),
    pageRecord({ id: "PG-4", parentPageId: "PG-1", turnIndex: 3, choiceId: "CHC-1", resolvedEventId: "SE-4" }),
  ];
  const childBodies = childPages.map((page) => writeRecord(fixture.storyRoot, "pages", String(page.id), page));

  writeRecord(fixture.storyRoot, "choices", "CHC-1", {
    id: "CHC-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    surface_label: "Follow the thread",
    player_visible_intent: "Investigate the pressure",
    target_or_action_families: ["investigate"],
    likely_state_pressure: ["secret", "obligation"],
    grounded_in: ["STENT-1", "SE-1"],
  });
  for (const [index, eventId] of ["SE-1", "SE-2", "SE-3", "SE-4"].entries()) {
    const body = writeRecord(fixture.storyRoot, "events", eventId, eventRecord(eventId, index === 0 ? "accept" : `variant_${index}`, "STENT-1"));
    insertNode(fixture.db, `red-bunny:${eventId}`, `stories/red-bunny/_source/events/${eventId}.yaml`, "event_record", body);
  }
  const entityBody = writeRecord(fixture.storyRoot, "entities", "STENT-1", {
    id: "STENT-1",
    story_id: "STORY-1",
    name: "Red Bunny",
  });
  insertNode(fixture.db, "red-bunny:STENT-1", "stories/red-bunny/_source/entities/STENT-1.yaml", "story_entity_record", entityBody);
  const proseBody = "Rendered prose for PG-1.\n";
  writeFileSync(path.join(fixture.storyRoot, "pages-prose", "PG-1.md"), proseBody, "utf8");
  writeFileSync(path.join(fixture.storyRoot, "pages-prose-plans", "PG-1.md"), "Plan body\n", "utf8");
  writeFileSync(
    path.join(fixture.storyRoot, "pages-prose-receipts", "PG-1.yaml"),
    YAML.stringify({ verdict: "PASS", state_hash: sha256Hex(proseBody) }),
    "utf8"
  );
  insertPageNode(fixture.db, "PG-1", root);
  for (const [index, childBody] of childBodies.entries()) {
    insertPageNode(fixture.db, `PG-${index + 2}`, childBody);
  }
  insertEdge(fixture.db, "red-bunny:SE-1", "red-bunny:STENT-1", "state_delta_create");
  insertEdge(fixture.db, "red-bunny:SE-3", "red-bunny:STENT-1", "state_delta_supersede");
  insertEdge(fixture.db, "red-bunny:STENT-1", "red-bunny:SE-1", "creation_evidence");
  return fixture;
}

test("getPageDetail assembles page, prose, receipt, choices, variants, event delta, and raw sources", async () => {
  const fixture = seedPageDetailFixture();
  fixture.db.close();

  const detail = await getPageDetail("fixture-world", "red-bunny", "PG-1", fixture.repoRoot);

  assert.equal(detail.proseStatus, "present");
  assert.equal(detail.prose, "Rendered prose for PG-1.\n");
  assert.equal(detail.pagePlanSummary?.body, "Plan body\n");
  assert.equal(detail.receiptSummary?.verdict, "PASS");
  assert.deepEqual(detail.currentStateRecordIds, ["STENT-1"]);
  assert.equal(detail.choiceNavigation.length, 1);
  assert.equal(detail.choiceNavigation[0]?.choiceId, "CHC-1");
  assert.deepEqual(detail.choiceNavigation[0]?.pressure, ["secret", "obligation"]);
  assert.equal(detail.choiceNavigation[0]?.groundedInCount, 2);
  assert.equal(detail.choiceNavigation[0]?.childOutcomeVariants.length, 3);
  assert.deepEqual(
    detail.choiceNavigation[0]?.childOutcomeVariants.map((variant) => variant.pageId),
    ["PG-2", "PG-3", "PG-4"]
  );
  assert.equal(detail.choiceNavigation[0]?.childOutcomeVariants[0]?.resolutionPreview, "variant_1 preview");
  assert.equal(detail.eventDelta.eventId, "SE-1");
  assert.equal(detail.eventDelta.createCount, 1);
  assert.equal(detail.eventDelta.relationCount, 1);
  assert.equal(detail.validationIntegrity.proseStatus, "present");
  assert.equal(detail.branchContext.branchId, "BR-1");
  assert.deepEqual(
    detail.rawSources.map((source) => source.recordId),
    ["PG-1", "STENT-1"]
  );
});

test("getRecordProvenance mirrors indexed state-delta and creation-evidence edge walks", async () => {
  const fixture = seedPageDetailFixture();
  fixture.db.close();

  const provenance = await getRecordProvenance("fixture-world", "red-bunny", "STENT-1", fixture.repoRoot);

  assert.equal(provenance.creatingSeId, "SE-1");
  assert.deepEqual(provenance.modifyingSeIds, ["SE-3"]);
  assert.deepEqual(provenance.evidenceRecords, ["SE-1"]);
});
