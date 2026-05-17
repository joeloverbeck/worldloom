import assert from "node:assert/strict";
import test from "node:test";

import { listRecords } from "../../src/tools/list-records";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";
import {
  STORY_FIXTURE_OTHER_SLUG,
  STORY_FIXTURE_WORLD,
  STORY_FIXTURE_SLUG,
  buildStoryBundleWorld,
  storyNodeId
} from "./story-bundle-fixture";

function buildLargeStoryletWorld(root: string): void {
  const nodes = Array.from({ length: 40 }, (_, index) => {
    const ordinal = index + 1;
    const id = `SLT-${ordinal.toString().padStart(4, "0")}`;
    const selected = ordinal <= 8;
    const shape = selected
      ? ordinal % 2 === 0
        ? "routine_disruption"
        : "reflection_dilemma"
      : "quiet_interlude";
    const contentIntensity = selected ? (ordinal % 2 === 0 ? "mature" : "tame") : "explicit";
    const visibilityScope = selected ? "global_author_pool" : "branch_locked";

    return {
      node_id: storyNodeId(STORY_FIXTURE_SLUG, id),
      world_slug: STORY_FIXTURE_WORLD,
      story_slug: STORY_FIXTURE_SLUG,
      file_path: `stories/${STORY_FIXTURE_SLUG}/_source/storylets/${id}.yaml`,
      node_type: "storylet_record" as const,
      body: [
        `id: ${id}`,
        `title: Storylet ${ordinal}`,
        `shape: ${shape}`,
        `content_intensity: ${contentIntensity}`,
        "visibility:",
        `  scope: ${visibilityScope}`,
        "  allowed_branch_ids:",
        selected ? "    - BR-0001" : "    - BR-9999",
        "hard_preconds:",
        "  - protagonist_present",
        "cast_requirements:",
        "  - role: protagonist",
        "summary: This deliberately padded summary makes unfiltered response size materially larger than filtered response size for transport-budget regression coverage.",
        ""
      ].join("\n")
    };
  });

  seedWorld(root, {
    worldSlug: STORY_FIXTURE_WORLD,
    nodes
  });
}

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
    assert.deepEqual(result.records.map((record) => record.record_id), ["SLT-21"]);
    const record = result.records[0] as Record<string, unknown>;
    assert.equal(record.record_kind, "storylet_record");
    assert.equal(record.title, "Loft Choice");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords returns story status records scoped by story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "story_status_record",
        story_slug: STORY_FIXTURE_SLUG,
        include_full_body: true
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.total, 1);
    assert.deepEqual(result.records.map((record) => record.record_id), ["STSTAT-1"]);
    const record = result.records[0] as { body?: Record<string, unknown> };
    assert.equal(record.body?.record_kind, "story_status_record");
    assert.equal(record.body?.life, "alive");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords returns belief records scoped by story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const compact = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "belief_record",
        story_slug: STORY_FIXTURE_SLUG,
        fields: ["id", "holder", "claim", "belief_mode", "truth_relation", "confidence", "visibility"]
      })
    );
    const fullBody = await withRepoRoot(root, () =>
      listRecords({
        world_slug: "seeded",
        record_type: "belief_record",
        story_slug: STORY_FIXTURE_SLUG,
        include_full_body: true
      })
    );

    assert.ok(!("code" in compact));
    assert.equal(compact.total, 2);
    assert.deepEqual(compact.records.map((record) => record.record_id), ["BEL-1", "BEL-2"]);
    assert.deepEqual(compact.records[0], {
      record_id: "BEL-1",
      id: "BEL-1",
      holder: "STENT-2",
      claim: "Marla believes the loft is empty.",
      belief_mode: "believes",
      truth_relation: "false",
      confidence: "likely",
      visibility: "private"
    });

    assert.ok(!("code" in fullBody));
    assert.equal(fullBody.total, 2);
    const record = fullBody.records[0] as { body?: Record<string, unknown> };
    assert.equal(record.body?.record_kind, "belief_record");
    assert.equal(record.body?.claim, "Marla believes the loft is empty.");
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
    assert.deepEqual(current.records.map((record) => record.record_id), ["SLT-21"]);
    assert.deepEqual(other.records.map((record) => record.record_id), ["SLT-21"]);
    assert.equal((current.records[0] as Record<string, unknown>).title, "Loft Choice");
    assert.equal((other.records[0] as Record<string, unknown>).title, "Salt Thread Choice");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords filters story-bundle records by dotted paths and reduces response size", async () => {
  const root = createTempRepoRoot();

  try {
    buildLargeStoryletWorld(root);

    const unfiltered = await withRepoRoot(root, () =>
      listRecords({
        world_slug: STORY_FIXTURE_WORLD,
        record_type: "storylet_record",
        story_slug: STORY_FIXTURE_SLUG,
        fields: ["id", "title", "shape", "content_intensity", "visibility", "hard_preconds", "cast_requirements"]
      })
    );
    const filtered = await withRepoRoot(root, () =>
      listRecords({
        world_slug: STORY_FIXTURE_WORLD,
        record_type: "storylet_record",
        story_slug: STORY_FIXTURE_SLUG,
        filters: {
          shape: ["routine_disruption", "reflection_dilemma"],
          content_intensity: ["mature", "tame"],
          "visibility.scope": "global_author_pool",
          "visibility.allowed_branch_ids": "BR-0001"
        },
        fields: ["id", "title", "shape", "content_intensity", "visibility", "hard_preconds", "cast_requirements"]
      })
    );

    assert.ok(!("code" in unfiltered));
    assert.ok(!("code" in filtered));
    assert.equal(unfiltered.total, 40);
    assert.equal(filtered.total, 8);
    assert.ok(
      JSON.stringify(filtered).length < JSON.stringify(unfiltered).length / 3,
      "filtered response should be materially smaller than the whole-class response"
    );
    assert.ok(
      JSON.stringify(filtered).length < 20_000,
      "filtered response should remain below the conservative transport-fitting threshold"
    );
    assert.deepEqual(
      filtered.records.map((record) => (record as Record<string, unknown>).shape),
      [
        "reflection_dilemma",
        "routine_disruption",
        "reflection_dilemma",
        "routine_disruption",
        "reflection_dilemma",
        "routine_disruption",
        "reflection_dilemma",
        "routine_disruption"
      ]
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords returns accepted projection keys for story-bundle validation errors", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: STORY_FIXTURE_WORLD,
        record_type: "storylet_record",
        story_slug: STORY_FIXTURE_SLUG,
        fields: ["unknown_storylet_key"]
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "fields");
    assert.deepEqual(result.details?.unknown_projection_keys, ["unknown_storylet_key"]);
    assert.deepEqual(result.details?.accepted_projection_keys, [
      "id",
      "move_family",
      "opens_obligations",
      "provenance",
      "record_id",
      "record_kind",
      "saliency",
      "scope",
      "summary",
      "title"
    ]);
    assert.equal(result.details?.record_type, "storylet_record");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords returns empty accepted projection keys for empty story-bundle result sets", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: STORY_FIXTURE_WORLD,
        record_type: "storylet_record",
        story_slug: STORY_FIXTURE_SLUG,
        filters: { id: "SLT-9999" },
        fields: ["unknown_storylet_key"]
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "fields");
    assert.deepEqual(result.details?.unknown_projection_keys, ["unknown_storylet_key"]);
    assert.deepEqual(result.details?.accepted_projection_keys, []);
    assert.match(
      String(result.details?.note),
      /Empty result set: accepted projection keys cannot be derived/
    );
    assert.equal(result.details?.record_type, "storylet_record");
  } finally {
    destroyTempRepoRoot(root);
  }
});
