import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import Database from "better-sqlite3";
import { openIndex } from "@worldloom/world-index/index/open";
import { CURRENT_INDEX_VERSION } from "@worldloom/world-index/public/types";

import { enumerateStories, getPageSummaries } from "../src/read/story-list.js";
import { enumerateWorlds } from "../src/read/world-list.js";

function createTempRepo(): string {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-enumeration-"));
  mkdirSync(path.join(repoRoot, ".git"));
  mkdirSync(path.join(repoRoot, "worlds"), { recursive: true });
  return repoRoot;
}

function createStory(repoRoot: string, worldSlug = "fixture-world", storySlug = "red-bunny"): string {
  const storyRoot = path.join(repoRoot, "worlds", worldSlug, "stories", storySlug);
  mkdirSync(path.join(storyRoot, "_source", "pages"), { recursive: true });
  mkdirSync(path.join(storyRoot, "pages-prose"), { recursive: true });
  mkdirSync(path.join(storyRoot, "pages-prose-plans"), { recursive: true });
  mkdirSync(path.join(storyRoot, "pages-prose-receipts"), { recursive: true });
  writeFileSync(
    path.join(storyRoot, "STORY_KERNEL.md"),
    ["---", "story_id: STORY-1", "title: Red Bunny", "---", ""].join("\n"),
    "utf8"
  );
  return storyRoot;
}

function pageBody(args: {
  id: string;
  branchId?: string;
  parentPageId?: string | null;
  turnIndex?: number;
  choiceId?: string | null;
  terminalStatus?: string;
  emittedChoices?: string[];
}): string {
  return JSON.stringify({
    id: args.id,
    story_id: "STORY-1",
    branch_id: args.branchId ?? "BR-1",
    parent_page_id: args.parentPageId ?? null,
    branch_path: [args.parentPageId, args.id].filter(Boolean),
    turn_index: args.turnIndex ?? 0,
    input: {
      choice_id: args.choiceId ?? null,
      manual_action_text: null,
      resolved_event_id: "SE-1",
    },
    state_snapshot: {
      active_records: {
        STCHAR: ["STCHAR-1"],
        STENT: ["STENT-1", "STENT-2"],
      },
      continuation: {
        terminal_status: args.terminalStatus ?? "open",
        terminal_rationale: null,
      },
    },
    plan: { plan_hash: "0".repeat(64) },
    prose_plan_path: `pages-prose-plans/${args.id}.md`,
    emitted_choices: args.emittedChoices ?? [],
    validation_trace: {},
  });
}

function writePage(storyRoot: string, body: string): void {
  const parsed = JSON.parse(body) as { id: string };
  writeFileSync(path.join(storyRoot, "_source", "pages", `${parsed.id}.yaml`), body, "utf8");
}

function createIndex(repoRoot: string, worldSlug: string): Database.Database {
  return openIndex(repoRoot, worldSlug);
}

function insertPageNode(
  db: Database.Database,
  worldSlug: string,
  storySlug: string,
  pageId: string,
  body: string
): void {
  const filePath = `stories/${storySlug}/_source/pages/${pageId}.yaml`;
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
      VALUES (?, ?, ?, NULL, 0, 0, 1, 1, 'page_record', ?, 'hash', 'anchor', NULL, 1, ?)
    `
  ).run(pageId, worldSlug, filePath, body, storySlug);
  db.prepare(
    `
      INSERT INTO file_versions (world_slug, file_path, content_hash, last_indexed_at)
      VALUES (?, ?, ?, ?)
    `
  ).run(worldSlug, filePath, "hash", "2026-05-26T00:00:00.000Z");
}

test("enumerateWorlds returns worlds with missing index status", async () => {
  const repoRoot = createTempRepo();
  createStory(repoRoot);

  const worlds = await enumerateWorlds(repoRoot);

  assert.equal(worlds.length, 1);
  assert.equal(worlds[0]?.worldSlug, "fixture-world");
  assert.equal(worlds[0]?.displayName, "Fixture World");
  assert.equal(worlds[0]?.storyCount, 1);
  assert.equal(worlds[0]?.hasWorldDb, false);
  assert.equal(worlds[0]?.indexStatus.kind, "missing");
});

test("enumerateWorlds reports fresh index metadata when the index exists", async () => {
  const repoRoot = createTempRepo();
  const storyRoot = createStory(repoRoot);
  const body = pageBody({ id: "PG-1" });
  writePage(storyRoot, body);
  const db = createIndex(repoRoot, "fixture-world");
  insertPageNode(db, "fixture-world", "red-bunny", "PG-1", body);
  db.close();

  const worlds = await enumerateWorlds(repoRoot);

  assert.equal(worlds[0]?.indexStatus.kind, "fresh");
  assert.equal(worlds[0]?.indexVersion, CURRENT_INDEX_VERSION);
  assert.equal(worlds[0]?.hasWorldDb, true);
});

test("enumerateStories derives story and page counts from a fresh index plus direct prose files", async () => {
  const repoRoot = createTempRepo();
  const storyRoot = createStory(repoRoot);
  const rootBody = pageBody({ id: "PG-1", emittedChoices: ["CHC-1"] });
  const childBody = pageBody({ id: "PG-2", parentPageId: "PG-1", choiceId: "CHC-1", turnIndex: 1 });
  writePage(storyRoot, rootBody);
  writePage(storyRoot, childBody);
  writeFileSync(path.join(storyRoot, "pages-prose", "PG-1.md"), "Rendered prose\n", "utf8");

  const db = createIndex(repoRoot, "fixture-world");
  insertPageNode(db, "fixture-world", "red-bunny", "PG-1", rootBody);
  insertPageNode(db, "fixture-world", "red-bunny", "PG-2", childBody);
  db.close();

  const stories = await enumerateStories("fixture-world", repoRoot);

  assert.equal(stories.length, 1);
  assert.equal(stories[0]?.storyId, "STORY-1");
  assert.equal(stories[0]?.title, "Red Bunny");
  assert.equal(stories[0]?.pageCount, 2);
  assert.equal(stories[0]?.choiceCount, 1);
  assert.equal(stories[0]?.branchCount, 1);
  assert.equal(stories[0]?.renderedProseCount, 1);
  assert.deepEqual(stories[0]?.leafPageIds, ["PG-2"]);
  assert.equal(stories[0]?.rootPageId, "PG-1");
  assert.equal(stories[0]?.latestPageId, "PG-2");
});

test("getPageSummaries derives terminalReason variants from filesystem fallback pages", async () => {
  const repoRoot = createTempRepo();
  const storyRoot = createStory(repoRoot);
  writePage(storyRoot, pageBody({ id: "PG-1", emittedChoices: ["CHC-1", "CHC-2", "CHC-3"] }));
  writePage(storyRoot, pageBody({ id: "PG-2", parentPageId: "PG-1", choiceId: "CHC-1", turnIndex: 1 }));
  writePage(
    storyRoot,
    pageBody({
      id: "PG-3",
      parentPageId: "PG-1",
      choiceId: "CHC-2",
      turnIndex: 2,
      terminalStatus: "branch_pause",
    })
  );
  writePage(
    storyRoot,
    pageBody({
      id: "PG-4",
      parentPageId: "PG-1",
      choiceId: "CHC-3",
      turnIndex: 3,
      terminalStatus: "terminal_closed",
    })
  );
  writeFileSync(path.join(storyRoot, "pages-prose", "PG-2.md"), "Rendered prose\n", "utf8");
  writeFileSync(path.join(storyRoot, "pages-prose-plans", "PG-2.md"), "Plan\n", "utf8");
  writeFileSync(path.join(storyRoot, "pages-prose-receipts", "PG-2.yaml"), "id: receipt\n", "utf8");

  const pages = await getPageSummaries("fixture-world", "red-bunny", repoRoot);
  const byId = new Map(pages.map((page) => [page.pageId, page]));

  assert.equal(byId.get("PG-1")?.terminalReason, null);
  assert.equal(byId.get("PG-2")?.terminalReason, "no_children");
  assert.equal(byId.get("PG-3")?.terminalReason, "paused");
  assert.equal(byId.get("PG-4")?.terminalReason, "terminal");
  assert.equal(byId.get("PG-2")?.hasRenderedProse, true);
  assert.equal(byId.get("PG-2")?.hasPlan, true);
  assert.equal(byId.get("PG-2")?.hasReceipt, true);
  assert.deepEqual(byId.get("PG-2")?.activeRecordCounts, { STCHAR: 1, STENT: 2 });
});
