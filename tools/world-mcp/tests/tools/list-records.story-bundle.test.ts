import assert from "node:assert/strict";
import test from "node:test";

import { listRecords } from "../../src/tools/list-records";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "./_shared";
import {
  STORY_FIXTURE_OTHER_SLUG,
  STORY_FIXTURE_SLUG,
  buildStoryBundleWorld
} from "./story-bundle-fixture";

test("listRecords returns story-bundle records scoped by story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "storylet_record",
        story_slug: STORY_FIXTURE_SLUG
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.total, 1);
    assert.deepEqual(result.records.map((record) => record.record_id), ["SLT-0021"]);
    const record = result.records[0] as Record<string, unknown>;
    assert.equal(record.record_kind, "storylet_record");
    assert.equal(record.title, "Loft Choice");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords requires story_slug for story-bundle record types", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({ world_slug: "seeded", record_type: "storylet_record" })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "story_slug");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords isolates duplicate authored story ids across bundles", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const current = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "storylet_record",
        story_slug: STORY_FIXTURE_SLUG
      })
    );
    const other = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "storylet_record",
        story_slug: STORY_FIXTURE_OTHER_SLUG
      })
    );

    assert.ok(!("code" in current));
    assert.ok(!("code" in other));
    assert.deepEqual(current.records.map((record) => record.record_id), ["SLT-0021"]);
    assert.deepEqual(other.records.map((record) => record.record_id), ["SLT-0021"]);
    assert.equal((current.records[0] as Record<string, unknown>).title, "Loft Choice");
    assert.equal((other.records[0] as Record<string, unknown>).title, "Salt Thread Choice");
  } finally {
    destroyTempRepoRoot(root);
  }
});
