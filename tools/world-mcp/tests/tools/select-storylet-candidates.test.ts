import assert from "node:assert/strict";
import test from "node:test";

import { selectStoryletCandidates } from "../../src/tools/select-storylet-candidates.js";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared.js";

const WORLD = "seeded";
const STORY = "opening-bells";

function storyNodeId(recordId: string): string {
  return `${STORY}:${recordId}`;
}

function sltProjection(id: string, fields: {
  visibility?: string;
  branchId?: string | null;
  branchPrefix?: string[] | null;
  moveFamily?: string;
  urgency?: string;
  cooldown?: number;
  mysteryAuthority?: string;
}) {
  return {
    node_id: storyNodeId(id),
    world_slug: WORLD,
    story_slug: STORY,
    slt_scope_visibility: fields.visibility ?? "global_author_pool",
    slt_scope_branch_id: fields.branchId ?? null,
    slt_scope_branch_path_prefix:
      fields.branchPrefix === undefined || fields.branchPrefix === null
        ? null
        : JSON.stringify(fields.branchPrefix),
    slt_provenance_origin: "manual_authoring",
    slt_move_family: fields.moveFamily ?? "investigation",
    slt_saliency_urgency: fields.urgency ?? "medium",
    slt_saliency_cooldown_pages: fields.cooldown ?? 0,
    slt_mystery_policy_allowed_authority: fields.mysteryAuthority ?? "none",
    candidate_projection_hash: `${id.replace("SLT-", "").padStart(64, "0")}`
  };
}

function edge(sourceId: string, edgeType: string, target: string) {
  return {
    story_slug: STORY,
    source_node_id: storyNodeId(sourceId),
    target_unresolved_ref: target,
    edge_type: edgeType as never
  };
}

function storyNode(recordId: string, nodeType: string, body: string) {
  const subdir = nodeType === "page_record" ? "pages" : nodeType === "story_event_record" ? "events" : "records";
  return {
    node_id: storyNodeId(recordId),
    world_slug: WORLD,
    story_slug: STORY,
    file_path: `stories/${STORY}/_source/${subdir}/${recordId}.yaml`,
    node_type: nodeType as never,
    body
  };
}

function storyletNode(recordId: string) {
  return storyNode(
    recordId,
    "storylet_record",
    [
      `id: ${recordId}`,
      "title: Candidate",
      "move_family: investigation",
      "scope:",
      "  visibility: global_author_pool",
      "  branch_id: null",
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
      "  origin: manual_authoring",
      "grounding:",
      "  compatible_turn_drivers: [player_action]",
      "  reason_to_exist: Candidate fixture for indexed retrieval.",
      ""
    ].join("\n")
  );
}

function buildCandidateWorld(root: string): void {
  const storylets = Array.from({ length: 9 }, (_, index) => storyletNode(`SLT-${index + 1}`));
  seedWorld(root, {
    worldSlug: WORLD,
    nodes: [
      storyNode(
        "PG-1",
        "page_record",
        [
          "id: PG-1",
          "branch_id: BR-1",
          "branch_path: [PG-1, PG-2]",
          "state_snapshot:",
          "  active_records:",
          "    STCHAR: [STCHAR-1]",
          "    STEMO: [STEMO-1]",
          "  unresolved_mystery_claims:",
          "    - mystery_id: M-1",
          "      authority: apparent",
          "      status: clue_added",
          ""
        ].join("\n")
      ),
      storyNode("STCHAR-1", "story_character_authority_record", "---\nid: STCHAR-1\n---\n"),
      storyNode("STEMO-1", "story_emotion_record", "id: STEMO-1\nstatus: active\n"),
      storyNode(
        "SE-1",
        "story_event_record",
        "id: SE-1\ncreated_at_page: PG-1\ncommitment:\n  selected_slt_id: SLT-9\n"
      ),
      ...storylets
    ],
    sltProjections: [
      sltProjection("SLT-1", { urgency: "high", moveFamily: "investigation" }),
      sltProjection("SLT-2", {
        visibility: "branch_prefix_scoped",
        branchId: "BR-1",
        branchPrefix: ["PG-1"],
        urgency: "medium",
        moveFamily: "disclosure",
        mysteryAuthority: "apparent"
      }),
      sltProjection("SLT-3", { visibility: "branch_scoped", branchId: "BR-2" }),
      sltProjection("SLT-4", {}),
      sltProjection("SLT-5", {}),
      sltProjection("SLT-6", {}),
      sltProjection("SLT-7", {}),
      sltProjection("SLT-8", { mysteryAuthority: "canon_candidate" }),
      sltProjection("SLT-9", { cooldown: 2 })
    ],
    edges: [
      ...["SLT-1", "SLT-2", "SLT-3", "SLT-5", "SLT-6", "SLT-7", "SLT-8", "SLT-9"].map((id) =>
        edge(id, "storylet_compatible_driver", "player_action")
      ),
      edge("SLT-4", "storylet_compatible_driver", "npc_action"),
      ...["SLT-1", "SLT-3", "SLT-4", "SLT-6", "SLT-7", "SLT-8", "SLT-9"].map((id) =>
        edge(id, "storylet_action_family", "investigate")
      ),
      edge("SLT-2", "storylet_action_family", "communicate"),
      edge("SLT-5", "storylet_action_family", "harm"),
      ...["SLT-1", "SLT-3", "SLT-4", "SLT-5", "SLT-7", "SLT-8", "SLT-9"].map((id) =>
        edge(id, "storylet_predicate_pred", "record_active")
      ),
      edge("SLT-2", "storylet_predicate_pred", "emotion_active"),
      edge("SLT-6", "storylet_predicate_pred", "record_active"),
      ...["SLT-1", "SLT-3", "SLT-4", "SLT-5", "SLT-7", "SLT-8", "SLT-9"].map((id) =>
        edge(id, "storylet_predicate_class", "story_character_authority_record")
      ),
      edge("SLT-2", "storylet_predicate_class", "story_emotion_record"),
      edge("SLT-6", "storylet_predicate_class", "story_secret_record"),
      edge("SLT-2", "storylet_predicate_ref", "STEMO-1"),
      edge("SLT-7", "storylet_predicate_ref", "STOBJ-99")
    ]
  });
}

test("selectStoryletCandidates filters indexed SLT projections and returns only projection records", async () => {
  const root = createTempRepoRoot();

  try {
    buildCandidateWorld(root);

    const result = await withRepoRoot(root, () =>
      selectStoryletCandidates({
        world_slug: WORLD,
        story_slug: STORY,
        parent_page_id: "PG-1",
        turn_driver: {
          kind: "player_action",
          initiator: "STENT-1",
          driver_records: ["STCHAR-1"]
        },
        intent_signature: {
          action_families: ["investigate", "communicate"]
        },
        max_candidates: 24
      })
    );

    assert.ok(!("code" in result));
    assert.deepEqual(result.filter_trace, {
      pool_total: 9,
      after_scope: 8,
      after_driver_kind: 7,
      after_action_family: 6,
      after_predicate_shape: 6,
      after_predicate_class: 5,
      after_source_record_id: 4,
      after_mystery_policy: 3,
      after_cooldown: 2,
      cooldown_active_samples: [
        {
          slt_id: "SLT-9",
          last_selected_on_page: "PG-1",
          distance: 1,
          cooldown_pages: 2
        }
      ]
    });
    assert.deepEqual(result.shortlisted_candidate_ids, ["SLT-1", "SLT-2"]);
    assert.deepEqual(result.requires_full_body_ids, ["SLT-1", "SLT-2"]);
    assert.deepEqual(result.shortlisted_projection_records.map((record) => record.id), [
      "SLT-1",
      "SLT-2"
    ]);
    assert.equal(
      result.shortlisted_projection_records.some((record) => "body" in record || "full_body" in record),
      false
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("selectStoryletCandidates rejects invalid max_candidates", async () => {
  const root = createTempRepoRoot();

  try {
    buildCandidateWorld(root);

    const result = await withRepoRoot(root, () =>
      selectStoryletCandidates({
        world_slug: WORLD,
        story_slug: STORY,
        parent_page_id: "PG-1",
        turn_driver: {
          kind: "player_action",
          driver_records: []
        },
        max_candidates: 0
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "max_candidates");
  } finally {
    destroyTempRepoRoot(root);
  }
});
