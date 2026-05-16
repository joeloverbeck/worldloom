import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";
import yaml from "js-yaml";
import type { PatchPlanEnvelope } from "@worldloom/patch-engine";

import { buildReadSurface } from "../../src/cli/_helpers.js";
import { buildPreApplyReadSurface } from "../../src/_helpers/index-access.js";

const MIGRATIONS = path.resolve(process.cwd(), "../world-index/src/schema/migrations");

function createDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(readFileSync(path.join(MIGRATIONS, "001_initial.sql"), "utf8"));
  db.exec(readFileSync(path.join(MIGRATIONS, "002_scoped_references.sql"), "utf8"));
  db.exec(readFileSync(path.join(MIGRATIONS, "004_story_bundle_scope.sql"), "utf8"));
  seedNode(db, {
    nodeId: "alpha:BEL-1",
    nodeType: "belief_record",
    filePath: "stories/alpha/_source/beliefs/BEL-1.yaml",
    storySlug: "alpha",
    parsed: {
      id: "BEL-1",
      story_id: "STORY-1",
      created_at_page: "PG-2"
    }
  });
  seedNode(db, {
    nodeId: "alpha:PG-2",
    nodeType: "page_record",
    filePath: "stories/alpha/_source/pages/PG-2.yaml",
    storySlug: "alpha",
    parsed: {
      id: "PG-2",
      story_id: "STORY-1",
      state_snapshot: { active_records: { BEL: ["BEL-1"] } }
    }
  });
  return db;
}

test("pre-apply read surface reads BEL records by indexed node type", async () => {
  const db = createDb();
  try {
    const surface = buildPreApplyReadSurface(db, envelope());

    const beliefs = await surface.query({
      world_slug: "seeded",
      story_slug: "alpha",
      record_type: "belief_record"
    });
    const pages = await surface.query({
      world_slug: "seeded",
      story_slug: "alpha",
      record_type: "page_record"
    });

    assert.deepEqual(beliefs.map((record) => record.node_id), ["alpha:BEL-1"]);
    assert.deepEqual(pages.map((record) => record.node_id), ["alpha:PG-2"]);
  } finally {
    db.close();
  }
});

test("full-world CLI read surface reads BEL records without affecting other types", async () => {
  const db = createDb();
  try {
    const surface = buildReadSurface(db, "seeded");

    const beliefs = await surface.query({
      world_slug: "seeded",
      story_slug: "alpha",
      record_type: "belief_record"
    });
    const pages = await surface.query({
      world_slug: "seeded",
      story_slug: "alpha",
      record_type: "page_record"
    });

    assert.deepEqual(beliefs.map((record) => record.node_id), ["alpha:BEL-1"]);
    assert.deepEqual(pages.map((record) => record.node_id), ["alpha:PG-2"]);
  } finally {
    db.close();
  }
});

function envelope(): PatchPlanEnvelope {
  return {
    plan_id: "plan-bel-read-surface-001",
    target_world: "seeded",
    approval_token: "token-from-gate",
    verdict: "ACCEPT",
    originating_skill: "branching-story-page-cycle",
    expected_id_allocations: {},
    patches: []
  } as PatchPlanEnvelope;
}

function seedNode(
  db: Database.Database,
  input: {
    nodeId: string;
    nodeType: string;
    filePath: string;
    storySlug: string;
    parsed: Record<string, unknown>;
  }
): void {
  db.prepare(
    `INSERT INTO nodes (
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.nodeId,
    "seeded",
    input.filePath,
    null,
    0,
    0,
    1,
    1,
    input.nodeType,
    yaml.dump(input.parsed),
    `hash-${input.nodeId}`,
    `anchor-${input.nodeId}`,
    null,
    1,
    input.storySlug
  );
}
