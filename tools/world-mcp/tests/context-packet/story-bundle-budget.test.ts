import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import path from "node:path";

import Database from "better-sqlite3";

import { assembleContextPacket } from "../../src/context-packet/assemble";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "../tools/_shared";
import {
  buildStoryBundleWorld,
  STORY_FIXTURE_SLUG,
  STORY_FIXTURE_WORLD
} from "../tools/story-bundle-fixture";

function hashValue(source: string): string {
  return createHash("sha256").update(source.normalize("NFC"), "utf8").digest("hex");
}

function addLargeStoryletPool(root: string): void {
  const db = new Database(
    path.join(root, "worlds", STORY_FIXTURE_WORLD, "_index", "world.db")
  );
  try {
    const insert = db.prepare(
      `
        INSERT INTO nodes (
          node_id,
          world_slug,
          story_slug,
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
          created_at_index_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    );

    for (let index = 22; index <= 70; index += 1) {
      const id = `SLT-${String(index).padStart(4, "0")}`;
      const body = [
        `id: ${id}`,
        `title: Large Pool Storylet ${index}`,
        "move_family: decision",
        "scope:",
        "  visibility: global_author_pool",
        "  branch_id: null",
        "saliency:",
        "  urgency: medium",
        "  cooldown_pages: 0",
        "  tags:",
        "    - pool",
        ""
      ].join("\n");
      insert.run(
        `${STORY_FIXTURE_SLUG}:${id}`,
        STORY_FIXTURE_WORLD,
        STORY_FIXTURE_SLUG,
        `stories/${STORY_FIXTURE_SLUG}/_source/storylets/${id}.yaml`,
        null,
        0,
        body.length,
        1,
        body.split("\n").length,
        "storylet_record",
        body,
        hashValue(body),
        hashValue(`${id}:${body}`),
        null,
        4
      );
    }
  } finally {
    db.close();
  }
}

test("persisted context-packet summaries include story-bundle context summary", async () => {
  const root = createTempRepoRoot();
  const originalCeiling = process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;

  try {
    buildStoryBundleWorld(root);
    addLargeStoryletPool(root);
    process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = "9000";

    const result = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "commitment_block_authoring",
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        seed_nodes: ["entity:marla-kern"],
        token_budget: 18000
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.task_header.delivery_status, "persisted_with_summary");
    assert.ok(result.task_header.persisted_output_path !== undefined);
    assert.deepEqual(result.governing_summary?.story_bundle_context_summary, {
      story_slug: STORY_FIXTURE_SLUG,
      storylet_total: 50,
      visibility_filtered_storylet_count: 50,
      open_obligation_ids: ["OBL-0001"],
      active_thread_ids: ["THR-0001"],
      longest_active_branch_path: ["PG-0001"],
      recent_page_ids: ["PG-0001"],
      mystery_ids: ["M-0001"],
      cast_stent_ids: ["STENT-0002"],
      invariant_ids: ["INV-social-intimacy"]
    });
    assert.equal(result.story_bundle_context, null);
  } finally {
    if (originalCeiling === undefined) {
      delete process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
    } else {
      process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = originalCeiling;
    }
    destroyTempRepoRoot(root);
  }
});
