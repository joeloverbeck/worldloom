import assert from "node:assert/strict";
import test from "node:test";

import { listRecords } from "../../src/tools/list-records.js";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared.js";
import {
  STORY_FIXTURE_OTHER_SLUG,
  STORY_FIXTURE_WORLD,
  STORY_FIXTURE_SLUG,
  buildStoryBundleWorld,
  storyNodeId
} from "./story-bundle-fixture.js";

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
        "move_family: decision",
        `shape: ${shape}`,
        `content_intensity: ${contentIntensity}`,
        "visibility:",
        `  scope: ${visibilityScope}`,
        "  allowed_branch_ids:",
        selected ? "    - BR-0001" : "    - BR-9999",
        "grounding:",
        selected
          ? "  compatible_turn_drivers: [player_action, player_write_in]"
          : "  compatible_turn_drivers: [npc_action]",
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
    assert.equal(compact.total, 3);
    assert.deepEqual(compact.records.map((record) => record.record_id), ["BEL-1", "BEL-2", "BEL-3"]);
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
    assert.equal(fullBody.total, 3);
    const record = fullBody.records[0] as { body?: Record<string, unknown> };
    assert.equal(record.body?.record_kind, "belief_record");
    assert.equal(record.body?.claim, "Marla believes the loft is empty.");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords returns CLK, STSEC, and STQ records scoped by story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const clocks = await withRepoRoot(root, () =>
      listRecords({
        world_slug: STORY_FIXTURE_WORLD,
        record_type: "pressure_clock_record",
        story_slug: STORY_FIXTURE_SLUG,
        fields: ["id", "title", "clock_kind", "value", "max", "status"]
      })
    );
    const secrets = await withRepoRoot(root, () =>
      listRecords({
        world_slug: STORY_FIXTURE_WORLD,
        record_type: "story_secret_record",
        story_slug: STORY_FIXTURE_SLUG,
        fields: ["id", "secret_kind", "status", "salience"]
      })
    );
    const questions = await withRepoRoot(root, () =>
      listRecords({
        world_slug: STORY_FIXTURE_WORLD,
        record_type: "story_question_record",
        story_slug: STORY_FIXTURE_SLUG,
        include_full_body: true
      })
    );

    assert.ok(!("code" in clocks));
    assert.equal(clocks.total, 1);
    assert.deepEqual(clocks.records, [
      {
        record_id: "CLK-1",
        id: "CLK-1",
        title: "Loft Patrol",
        clock_kind: "danger",
        value: 2,
        max: 6,
        status: "active"
      }
    ]);

    assert.ok(!("code" in secrets));
    assert.equal(secrets.total, 1);
    assert.deepEqual(secrets.records[0], {
      record_id: "STSEC-1",
      id: "STSEC-1",
      secret_kind: "event_cause",
      status: "hidden",
      salience: "high"
    });

    assert.ok(!("code" in questions));
    assert.equal(questions.total, 1);
    const question = questions.records[0] as { body?: Record<string, unknown> };
    assert.equal(question.body?.record_kind, "story_question_record");
    assert.equal(question.body?.question_or_setup, "Who rang the loft bell?");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords returns STPLAN and STEMO records scoped by story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const plans = await withRepoRoot(root, () =>
      listRecords({
        world_slug: STORY_FIXTURE_WORLD,
        record_type: "story_plan_record",
        story_slug: STORY_FIXTURE_SLUG,
        fields: ["id", "holder", "objective", "plan_status", "supersedes"]
      })
    );
    const emotions = await withRepoRoot(root, () =>
      listRecords({
        world_slug: STORY_FIXTURE_WORLD,
        record_type: "story_emotion_record",
        story_slug: STORY_FIXTURE_SLUG,
        fields: ["id", "holder", "status", "affect_kind", "intensity", "supersedes"]
      })
    );

    assert.ok(!("code" in plans));
    assert.equal(plans.total, 2);
    assert.deepEqual(plans.records.map((record) => record.record_id), ["STPLAN-0", "STPLAN-1"]);
    assert.deepEqual(plans.records[1], {
      record_id: "STPLAN-1",
      id: "STPLAN-1",
      holder: "STENT-2",
      objective: "Reach the loft window by using the brass latch before the watcher arrives.",
      plan_status: "active",
      supersedes: "STPLAN-0"
    });

    assert.ok(!("code" in emotions));
    assert.equal(emotions.total, 3);
    assert.deepEqual(emotions.records.map((record) => record.record_id), [
      "STEMO-0",
      "STEMO-1",
      "STEMO-2"
    ]);
    assert.deepEqual(emotions.records[1], {
      record_id: "STEMO-1",
      id: "STEMO-1",
      holder: "STENT-2",
      status: "active",
      affect_kind: "anxiety",
      intensity: "high",
      supersedes: "STEMO-0"
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords returns STCHAR hybrid records scoped by story_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const compact = await withRepoRoot(root, () =>
      listRecords({
        world_slug: STORY_FIXTURE_WORLD,
        record_type: "story_character_authority_record",
        story_slug: STORY_FIXTURE_SLUG,
        fields: ["record_id", "record_kind", "title", "file_path"]
      })
    );
    const fullBody = await withRepoRoot(root, () =>
      listRecords({
        world_slug: STORY_FIXTURE_WORLD,
        record_type: "story_character_authority_record",
        story_slug: STORY_FIXTURE_SLUG,
        include_full_body: true
      })
    );

    assert.ok(!("code" in compact));
    assert.equal(compact.total, 1);
    assert.deepEqual(compact.records, [
      {
        record_id: "STCHAR-1",
        record_kind: "story_character_authority_record",
        title: "opening-bells:STCHAR-1",
        file_path: "stories/opening-bells/story-characters/STCHAR-1.md"
      }
    ]);

    assert.ok(!("code" in fullBody));
    assert.equal(fullBody.total, 1);
    const record = fullBody.records[0] as { body?: Record<string, unknown> };
    assert.equal(record.body?.record_kind, "story_character_authority_record");
    assert.deepEqual((record.body?.frontmatter as Record<string, unknown>).bound_stent_ids, ["STENT-2"]);
    assert.match(
      String((record.body?.body_sections as Record<string, unknown>)["Page-Plan Voice Block"]),
      /clipped, observant phrasing/
    );
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

test("listRecords projects story-bundle fields through dotted parsed-body paths", async () => {
  const root = createTempRepoRoot();

  try {
    buildLargeStoryletWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: STORY_FIXTURE_WORLD,
        record_type: "storylet_record",
        story_slug: STORY_FIXTURE_SLUG,
        filters: {
          "visibility.scope": "global_author_pool"
        },
        fields: ["grounding.compatible_turn_drivers"]
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.total, 8);
    assert.deepEqual(Object.keys(result.records[0]!).sort(), [
      "grounding.compatible_turn_drivers",
      "record_id"
    ]);
    assert.deepEqual((result.records[0] as Record<string, unknown>)["grounding.compatible_turn_drivers"], [
      "player_action",
      "player_write_in"
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords preserves mixed flat and dotted story-bundle projection fields", async () => {
  const root = createTempRepoRoot();

  try {
    buildLargeStoryletWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: STORY_FIXTURE_WORLD,
        record_type: "storylet_record",
        story_slug: STORY_FIXTURE_SLUG,
        filters: {
          id: "SLT-0001"
        },
        fields: ["move_family", "grounding.compatible_turn_drivers"]
      })
    );

    assert.ok(!("code" in result));
    assert.deepEqual(result.records, [
      {
        record_id: "SLT-0001",
        move_family: "decision",
        "grounding.compatible_turn_drivers": ["player_action", "player_write_in"]
      }
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("listRecords rejects unknown dotted story-bundle projection fields", async () => {
  const root = createTempRepoRoot();

  try {
    buildLargeStoryletWorld(root);

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: STORY_FIXTURE_WORLD,
        record_type: "storylet_record",
        story_slug: STORY_FIXTURE_SLUG,
        fields: ["grounding.nonexistent_leaf"]
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "fields");
    assert.deepEqual(result.details?.unknown_projection_keys, ["grounding.nonexistent_leaf"]);
    assert.ok((result.details?.accepted_projection_keys as string[]).includes("grounding"));
    assert.match(String(result.message), /dotted parsed-body paths/);
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
      "effects",
      "id",
      "move_family",
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
