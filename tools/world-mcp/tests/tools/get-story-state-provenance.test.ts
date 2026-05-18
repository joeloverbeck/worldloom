import assert from "node:assert/strict";
import test from "node:test";

import { getStoryStateProvenance } from "../../src/tools/get-story-state-provenance.js";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared.js";

const WORLD_SLUG = "seeded";
const STORY_SLUG = "opening-bells";

function scoped(recordId: string): string {
  return `${STORY_SLUG}:${recordId}`;
}

function buildProvenanceWorld(root: string): void {
  seedWorld(root, {
    worldSlug: WORLD_SLUG,
    nodes: [
      {
        node_id: "CF-1",
        world_slug: WORLD_SLUG,
        file_path: "_source/canon/CF-1.yaml",
        node_type: "canon_fact_record",
        body: "id: CF-1\ntitle: Bell Fact\n"
      },
      {
        node_id: scoped("SF-1"),
        world_slug: WORLD_SLUG,
        story_slug: STORY_SLUG,
        file_path: `stories/${STORY_SLUG}/_source/facts/SF-1.yaml`,
        node_type: "story_fact_record",
        body: "id: SF-1\nstatement: The bell rang.\n"
      },
      {
        node_id: scoped("CLK-1"),
        world_slug: WORLD_SLUG,
        story_slug: STORY_SLUG,
        file_path: `stories/${STORY_SLUG}/_source/clocks/CLK-1.yaml`,
        node_type: "pressure_clock_record",
        body: "id: CLK-1\ntitle: Bell Pressure\n"
      },
      {
        node_id: scoped("THR-1"),
        world_slug: WORLD_SLUG,
        story_slug: STORY_SLUG,
        file_path: `stories/${STORY_SLUG}/_source/threads/THR-1.yaml`,
        node_type: "thread_record",
        body: "id: THR-1\ntype: mystery\n"
      },
      {
        node_id: scoped("STQ-1"),
        world_slug: WORLD_SLUG,
        story_slug: STORY_SLUG,
        file_path: `stories/${STORY_SLUG}/_source/questions/STQ-1.yaml`,
        node_type: "story_question_record",
        body: "id: STQ-1\nquestion: Who rang the bell?\n"
      },
      {
        node_id: scoped("SE-1"),
        world_slug: WORLD_SLUG,
        story_slug: STORY_SLUG,
        file_path: `stories/${STORY_SLUG}/_source/events/SE-1.yaml`,
        node_type: "story_event_record",
        body: "id: SE-1\nsummary: Bell pressure starts.\n"
      },
      {
        node_id: scoped("SE-2"),
        world_slug: WORLD_SLUG,
        story_slug: STORY_SLUG,
        file_path: `stories/${STORY_SLUG}/_source/events/SE-2.yaml`,
        node_type: "story_event_record",
        body: "id: SE-2\nsummary: Bell pressure changes.\n"
      },
      {
        node_id: scoped("SE-3"),
        world_slug: WORLD_SLUG,
        story_slug: STORY_SLUG,
        file_path: `stories/${STORY_SLUG}/_source/events/SE-3.yaml`,
        node_type: "story_event_record",
        body: "id: SE-3\nsummary: Bell pressure changes again.\n"
      },
      {
        node_id: scoped("BEL-9"),
        world_slug: WORLD_SLUG,
        story_slug: STORY_SLUG,
        file_path: `stories/${STORY_SLUG}/_source/beliefs/BEL-9.yaml`,
        node_type: "belief_record",
        body: "id: BEL-9\nclaim: Legacy belief.\n"
      }
    ],
    edges: [
      {
        story_slug: STORY_SLUG,
        source_node_id: scoped("SE-1"),
        target_node_id: scoped("CLK-1"),
        edge_type: "state_delta_create"
      },
      {
        story_slug: STORY_SLUG,
        source_node_id: scoped("SE-2"),
        target_node_id: scoped("CLK-1"),
        edge_type: "state_delta_supersede"
      },
      {
        story_slug: STORY_SLUG,
        source_node_id: scoped("SE-3"),
        target_node_id: scoped("CLK-1"),
        edge_type: "state_delta_supersede"
      },
      {
        story_slug: STORY_SLUG,
        source_node_id: scoped("CLK-1"),
        target_node_id: "CF-1",
        edge_type: "creation_evidence"
      },
      {
        story_slug: STORY_SLUG,
        source_node_id: scoped("CLK-1"),
        target_node_id: scoped("SF-1"),
        edge_type: "creation_evidence"
      }
    ]
  });
}

test("getStoryStateProvenance returns creating, modifying, and evidence ids", async () => {
  const root = createTempRepoRoot();

  try {
    buildProvenanceWorld(root);

    const result = await withRepoRoot(root, () =>
      getStoryStateProvenance({
        record_id: "CLK-1",
        world_slug: WORLD_SLUG,
        story_slug: STORY_SLUG
      })
    );

    assert.ok(!("code" in result));
    assert.deepEqual(result, {
      record_id: "CLK-1",
      record_class: "CLK",
      creating_se_id: "SE-1",
      modifying_se_ids: ["SE-2", "SE-3"],
      evidence_records: ["CF-1", "SF-1"]
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getStoryStateProvenance returns null/empty arrays for legacy records", async () => {
  const root = createTempRepoRoot();

  try {
    buildProvenanceWorld(root);

    const result = await withRepoRoot(root, () =>
      getStoryStateProvenance({
        record_id: "BEL-9",
        world_slug: WORLD_SLUG,
        story_slug: STORY_SLUG
      })
    );

    assert.ok(!("code" in result));
    assert.deepEqual(result, {
      record_id: "BEL-9",
      record_class: "BEL",
      creating_se_id: null,
      modifying_se_ids: [],
      evidence_records: []
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getStoryStateProvenance rejects missing story_slug for bundle-scoped ids", async () => {
  const root = createTempRepoRoot();

  try {
    buildProvenanceWorld(root);

    const result = await withRepoRoot(root, () =>
      getStoryStateProvenance({
        record_id: "CLK-1",
        world_slug: WORLD_SLUG
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "story_slug");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("getStoryStateProvenance rejects unknown and non-story records", async () => {
  const root = createTempRepoRoot();

  try {
    buildProvenanceWorld(root);

    const missing = await withRepoRoot(root, () =>
      getStoryStateProvenance({
        record_id: "CLK-999",
        world_slug: WORLD_SLUG,
        story_slug: STORY_SLUG
      })
    );
    assert.ok("code" in missing);
    assert.equal(missing.code, "record_not_found");

    const nonStory = await withRepoRoot(root, () =>
      getStoryStateProvenance({
        record_id: "CF-1",
        world_slug: WORLD_SLUG
      })
    );
    assert.ok("code" in nonStory);
    assert.equal(nonStory.code, "invalid_input");
    assert.equal(nonStory.details?.field, "record_id");
  } finally {
    destroyTempRepoRoot(root);
  }
});
