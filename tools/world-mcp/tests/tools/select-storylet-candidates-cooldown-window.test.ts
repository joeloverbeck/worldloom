import assert from "node:assert/strict";
import test from "node:test";

import type { EdgeType, NodeType } from "@worldloom/world-index/public/types";

import { selectStoryletCandidates } from "../../src/tools/select-storylet-candidates.js";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared.js";

const WORLD = "seeded";
const STORY = "opening-bells";
const DRIVER = "player_action";

interface EventFixture {
  id: string;
  createdAtPage: string;
  selectedSltId: string;
  parentPageId?: string;
}

interface StoryletFixture {
  id: string;
  cooldown?: number | null;
}

function storyNodeId(recordId: string): string {
  return `${STORY}:${recordId}`;
}

function storyNode(recordId: string, nodeType: NodeType, body: string, subdir = "records") {
  return {
    node_id: storyNodeId(recordId),
    world_slug: WORLD,
    story_slug: STORY,
    file_path: `stories/${STORY}/_source/${subdir}/${recordId}.yaml`,
    node_type: nodeType,
    body
  };
}

function pageNode(parentPageId: string, branchPath: string[]) {
  return storyNode(
    parentPageId,
    "page_record",
    [
      `id: ${parentPageId}`,
      "branch_id: BR-1",
      `branch_path: [${branchPath.join(", ")}]`,
      "state_snapshot:",
      "  active_records: {}",
      "  unresolved_mystery_claims: []",
      ""
    ].join("\n"),
    "pages"
  );
}

function eventNode(event: EventFixture) {
  return storyNode(
    event.id,
    "story_event_record",
    [
      `id: ${event.id}`,
      ...(event.parentPageId === undefined ? [] : [`parent_page_id: ${event.parentPageId}`]),
      `created_at_page: ${event.createdAtPage}`,
      "commitment:",
      `  selected_slt_id: ${event.selectedSltId}`,
      ""
    ].join("\n"),
    "events"
  );
}

function storyletBody(recordId: string) {
  return [
    `id: ${recordId}`,
    "title: Cooldown candidate",
    "move_family: investigation",
    "scope:",
    "  visibility: global_author_pool",
    "preconditions:",
    "  hard: []",
    "beats:",
    "  - beat_id: setup",
    "    function: setup",
    "    instruction: Keep this candidate available.",
    "exit_options:",
    "  - action_family: investigate",
    "    surface_hint: Investigate.",
    "saliency:",
    "  urgency: medium",
    "  cooldown_pages: 0",
    "mystery_policy:",
    "  allowed_authority: none",
    "provenance:",
    "  origin: synthetic_fixture",
    "grounding:",
    `  compatible_turn_drivers: [${DRIVER}]`,
    "  reason_to_exist: Cooldown fixture.",
    ""
  ].join("\n");
}

function sltProjection(storylet: StoryletFixture) {
  return {
    node_id: storyNodeId(storylet.id),
    world_slug: WORLD,
    story_slug: STORY,
    slt_scope_visibility: "global_author_pool",
    slt_scope_branch_id: null,
    slt_scope_branch_path_prefix: null,
    slt_provenance_origin: "synthetic_fixture",
    slt_move_family: "investigation",
    slt_saliency_urgency: "medium",
    slt_saliency_cooldown_pages: storylet.cooldown === undefined ? 0 : storylet.cooldown,
    slt_mystery_policy_allowed_authority: "none",
    candidate_projection_hash: `${storylet.id}:cooldown`
  };
}

function edge(sourceId: string, edgeType: EdgeType, target: string) {
  return {
    story_slug: STORY,
    source_node_id: storyNodeId(sourceId),
    target_unresolved_ref: target,
    edge_type: edgeType
  };
}

function seedCooldownWorld(root: string, input: {
  parentPageId: string;
  branchPath: string[];
  events: EventFixture[];
  storylets: StoryletFixture[];
}): void {
  seedWorld(root, {
    worldSlug: WORLD,
    nodes: [
      pageNode(input.parentPageId, input.branchPath),
      ...input.events.map(eventNode),
      ...input.storylets.map((storylet) =>
        storyNode(storylet.id, "storylet_record", storyletBody(storylet.id), "storylets")
      )
    ],
    sltProjections: input.storylets.map(sltProjection),
    edges: input.storylets.map((storylet) => edge(storylet.id, "storylet_compatible_driver", DRIVER))
  });
}

async function selectFrom(root: string, parentPageId: string) {
  return withRepoRoot(root, () =>
    selectStoryletCandidates({
      world_slug: WORLD,
      story_slug: STORY,
      parent_page_id: parentPageId,
      turn_driver: {
        kind: DRIVER,
        driver_records: []
      },
      max_candidates: 24
    })
  );
}

test("cooldown blocks candidates selected inside the current branch window", async () => {
  const root = createTempRepoRoot();

  try {
    seedCooldownWorld(root, {
      parentPageId: "PG-3",
      branchPath: ["PG-1", "PG-2", "PG-3"],
      events: [{ id: "SE-1", createdAtPage: "PG-2", selectedSltId: "SLT-1" }],
      storylets: [{ id: "SLT-1", cooldown: 2 }]
    });

    const result = await selectFrom(root, "PG-3");

    assert.ok(!("code" in result));
    assert.deepEqual(result.shortlisted_candidate_ids, []);
    assert.equal(result.filter_trace.after_cooldown, 0);
    assert.deepEqual(result.filter_trace.cooldown_active_samples, [
      {
        slt_id: "SLT-1",
        last_selected_on_page: "PG-2",
        distance: 1,
        cooldown_pages: 2
      }
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("cooldown blocks candidates selected at the exact cooldown distance boundary", async () => {
  const root = createTempRepoRoot();

  try {
    seedCooldownWorld(root, {
      parentPageId: "PG-3",
      branchPath: ["PG-1", "PG-2", "PG-3"],
      events: [{ id: "SE-1", createdAtPage: "PG-1", selectedSltId: "SLT-1" }],
      storylets: [{ id: "SLT-1", cooldown: 2 }]
    });

    const result = await selectFrom(root, "PG-3");

    assert.ok(!("code" in result));
    assert.deepEqual(result.shortlisted_candidate_ids, []);
    assert.equal(result.filter_trace.after_cooldown, 0);
    assert.deepEqual(result.filter_trace.cooldown_active_samples, [
      {
        slt_id: "SLT-1",
        last_selected_on_page: "PG-1",
        distance: 2,
        cooldown_pages: 2
      }
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("cooldown allows candidates selected outside the numeric window", async () => {
  const root = createTempRepoRoot();

  try {
    seedCooldownWorld(root, {
      parentPageId: "PG-4",
      branchPath: ["PG-1", "PG-2", "PG-3", "PG-4"],
      events: [{ id: "SE-1", createdAtPage: "PG-1", selectedSltId: "SLT-1" }],
      storylets: [{ id: "SLT-1", cooldown: 2 }]
    });

    const result = await selectFrom(root, "PG-4");

    assert.ok(!("code" in result));
    assert.deepEqual(result.shortlisted_candidate_ids, ["SLT-1"]);
    assert.equal(result.filter_trace.after_cooldown, 1);
    assert.deepEqual(result.filter_trace.cooldown_active_samples, []);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("cooldown ignores selections whose created page is on a sibling branch", async () => {
  const root = createTempRepoRoot();

  try {
    seedCooldownWorld(root, {
      parentPageId: "PG-2",
      branchPath: ["PG-1", "PG-2"],
      events: [{ id: "SE-1", createdAtPage: "PG-SIBLING", selectedSltId: "SLT-1" }],
      storylets: [{ id: "SLT-1", cooldown: 2 }]
    });

    const result = await selectFrom(root, "PG-2");

    assert.ok(!("code" in result));
    assert.deepEqual(result.shortlisted_candidate_ids, ["SLT-1"]);
    assert.deepEqual(result.filter_trace.cooldown_active_samples, []);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("zero and null cooldown candidates bypass cooldown rejection", async () => {
  const root = createTempRepoRoot();

  try {
    seedCooldownWorld(root, {
      parentPageId: "PG-3",
      branchPath: ["PG-1", "PG-2", "PG-3"],
      events: [
        { id: "SE-1", createdAtPage: "PG-2", selectedSltId: "SLT-1" },
        { id: "SE-2", createdAtPage: "PG-2", selectedSltId: "SLT-2" }
      ],
      storylets: [
        { id: "SLT-1", cooldown: 0 },
        { id: "SLT-2", cooldown: null }
      ]
    });

    const result = await selectFrom(root, "PG-3");

    assert.ok(!("code" in result));
    assert.deepEqual(result.shortlisted_candidate_ids, ["SLT-1", "SLT-2"]);
    assert.equal(result.filter_trace.after_cooldown, 2);
    assert.deepEqual(result.filter_trace.cooldown_active_samples, []);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("cooldown ignores sibling fork events that share the current branch ancestor", async () => {
  const root = createTempRepoRoot();

  try {
    seedCooldownWorld(root, {
      parentPageId: "PG-6A",
      branchPath: ["PG-5", "PG-6A"],
      events: [
        {
          id: "SE-BR2",
          parentPageId: "PG-5",
          createdAtPage: "PG-6B",
          selectedSltId: "SLT-1"
        }
      ],
      storylets: [{ id: "SLT-1", cooldown: 2 }]
    });

    const result = await selectFrom(root, "PG-6A");

    assert.ok(!("code" in result));
    assert.deepEqual(result.shortlisted_candidate_ids, ["SLT-1"]);
    assert.equal(result.filter_trace.after_cooldown, 1);
    assert.deepEqual(result.filter_trace.cooldown_active_samples, []);
  } finally {
    destroyTempRepoRoot(root);
  }
});
