import assert from "node:assert/strict";
import test from "node:test";

import type { EdgeType, NodeType } from "@worldloom/world-index/public/types";

import { getContextPacket } from "../../src/tools/get-context-packet.js";
import { getRecords } from "../../src/tools/get-records.js";
import { listRecords } from "../../src/tools/list-records.js";
import { selectStoryletCandidates } from "../../src/tools/select-storylet-candidates.js";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "../tools/_shared.js";

/*
 * SPEC-81 manual dry-run runbook:
 * - §9.4 Turn-cycle end-to-end: seed the generated 1000-SLT fixture into a temp repo root,
 *   invoke branching-story-turn-cycle against PG-1, and confirm the run uses the SPEC-81
 *   shortlist path rather than a full-pool list_records(include_full_body=true) scan.
 * - §9.5 Commitment-block-authoring end-to-end: seed the same fixture into a temp repo root,
 *   invoke commitment-block-authoring direct_batch, and confirm the gap diagnostic reads
 *   projection rows for move_family, compatible_turn_drivers, and predicate_classes.
 */

const WORLD = "seeded";
const STORY = "opening-bells";
const PLAYER_DRIVER = "player_action";
const ACTIVE_RECORD_CLASS = "story_character_authority_record";

function storyNodeId(recordId: string): string {
  return `${STORY}:${recordId}`;
}

function storyPath(subdir: string, recordId: string): string {
  return `stories/${STORY}/_source/${subdir}/${recordId}.yaml`;
}

function storyNode(recordId: string, nodeType: NodeType, body: string, subdir = "records") {
  return {
    node_id: storyNodeId(recordId),
    world_slug: WORLD,
    story_slug: STORY,
    file_path: storyPath(subdir, recordId),
    node_type: nodeType,
    body
  };
}

function worldNode(recordId: string, nodeType: NodeType, body: string, filePath: string) {
  return {
    node_id: recordId,
    world_slug: WORLD,
    file_path: filePath,
    node_type: nodeType,
    body
  };
}

function storyletId(index: number): string {
  return `SLT-${index}`;
}

function storyletBody(id: string, fields: {
  actionFamily?: string;
  driverKind?: string;
  moveFamily?: string;
  urgency?: string;
  visibility?: string;
} = {}): string {
  const actionFamily = fields.actionFamily ?? "investigate";
  const driverKind = fields.driverKind ?? PLAYER_DRIVER;
  const moveFamily = fields.moveFamily ?? "investigation";
  const urgency = fields.urgency ?? "medium";
  const visibility = fields.visibility ?? "global_author_pool";

  return [
    `id: ${id}`,
    `title: Candidate ${id}`,
    `move_family: ${moveFamily}`,
    "scope:",
    `  visibility: ${visibility}`,
    "preconditions:",
    "  hard:",
    "    - pred: record_active",
    "      record: STCHAR-1",
    "beats:",
    "  - beat_id: setup",
    "    function: setup",
    `    instruction: Use ${id} as a generated SPEC-81 candidate.`,
    "exit_options:",
    `  - action_family: ${actionFamily}`,
    `    surface_hint: ${actionFamily} through the indexed candidate path.`,
    "saliency:",
    `  urgency: ${urgency}`,
    "  cooldown_pages: 0",
    "mystery_policy:",
    "  allowed_authority: none",
    "provenance:",
    "  origin: synthetic_fixture",
    "grounding:",
    `  compatible_turn_drivers: [${driverKind}]`,
    "  reason_to_exist: SPEC-81 capstone fixture.",
    ""
  ].join("\n");
}

function sltProjection(recordId: string, fields: {
  branchId?: string | null;
  branchPrefix?: string[] | null;
  cooldown?: number | null;
  moveFamily?: string | null;
  mysteryAuthority?: string | null;
  urgency?: string | null;
  visibility?: string | null;
} = {}) {
  return {
    node_id: storyNodeId(recordId),
    world_slug: WORLD,
    story_slug: STORY,
    slt_scope_visibility: fields.visibility ?? "global_author_pool",
    slt_scope_branch_id: fields.branchId ?? null,
    slt_scope_branch_path_prefix:
      fields.branchPrefix === undefined || fields.branchPrefix === null
        ? null
        : JSON.stringify(fields.branchPrefix),
    slt_provenance_origin: "synthetic_fixture",
    slt_move_family: fields.moveFamily ?? "investigation",
    slt_saliency_urgency: fields.urgency ?? "medium",
    slt_saliency_cooldown_pages: fields.cooldown ?? 0,
    slt_mystery_policy_allowed_authority: fields.mysteryAuthority ?? "none",
    candidate_projection_hash: `${recordId}:${fields.moveFamily ?? "investigation"}:${fields.urgency ?? "medium"}`
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

function baseNodes() {
  return [
    worldNode(
      "CF-1",
      "canon_fact_record",
      [
        "id: CF-1",
        "title: SPEC-81 Fixture World",
        "status: hard_canon",
        "type: entity",
        "statement: SPEC-81 fixture world exists for retrieval tests.",
        "scope:",
        "  geographic: local",
        "  temporal: current",
        "  social: public",
        "truth_scope:",
        "  world_level: true",
        "  diegetic_status: objective",
        "domains_affected: [ontology]",
        "required_world_updates: [ONTOLOGY.md]",
        "source_basis:",
        "  direct_user_approval: true",
        ""
      ].join("\n"),
      "_source/canon/CF-1.yaml"
    ),
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
        "  unresolved_mystery_claims:",
        "    - mystery_id: M-1",
        "      authority: apparent",
        "      status: clue_added",
        ""
      ].join("\n"),
      "pages"
    ),
    storyNode("STCHAR-1", "story_character_authority_record", "---\nid: STCHAR-1\n---\n", "characters")
  ];
}

function buildGeneratedPoolWorld(root: string): { storyletIds: string[] } {
  const moveFamilies = ["investigation", "decision", "disclosure", "world_pressure"];
  const urgencies = ["high", "medium", "low"];
  const storyletIds = Array.from({ length: 1000 }, (_, index) => storyletId(index + 1));

  seedWorld(root, {
    worldSlug: WORLD,
    nodes: [
      ...baseNodes(),
      ...storyletIds.map((id, index) =>
        storyNode(
          id,
          "storylet_record",
          storyletBody(id, {
            moveFamily: moveFamilies[index % moveFamilies.length]!,
            urgency: urgencies[index % urgencies.length]!
          }),
          "storylets"
        )
      )
    ],
    sltProjections: storyletIds.map((id, index) =>
      sltProjection(id, {
        moveFamily: moveFamilies[index % moveFamilies.length]!,
        urgency: urgencies[index % urgencies.length]!
      })
    ),
    edges: storyletIds.flatMap((id) => [
      edge(id, "storylet_compatible_driver", PLAYER_DRIVER),
      edge(id, "storylet_action_family", "investigate"),
      edge(id, "storylet_predicate_pred", "record_active"),
      edge(id, "storylet_predicate_class", ACTIVE_RECORD_CLASS)
    ])
  });

  return { storyletIds };
}

function buildHandCountedWorld(root: string): void {
  const storyletIds = Array.from({ length: 100 }, (_, index) => storyletId(index + 1));
  const selectedCooldownIds = new Set(["SLT-9", "SLT-10"]);

  seedWorld(root, {
    worldSlug: WORLD,
    nodes: [
      ...baseNodes(),
      storyNode(
        "SE-1",
        "story_event_record",
        [
          "id: SE-1",
          "created_at_page: PG-1",
          "commitment:",
          "  selected_slt_id: SLT-9",
          ""
        ].join("\n"),
        "events"
      ),
      storyNode(
        "SE-2",
        "story_event_record",
        [
          "id: SE-2",
          "created_at_page: PG-1",
          "commitment:",
          "  selected_slt_id: SLT-10",
          ""
        ].join("\n"),
        "events"
      ),
      ...storyletIds.map((id) => storyNode(id, "storylet_record", storyletBody(id), "storylets"))
    ],
    sltProjections: storyletIds.map((id, index) => {
      const ordinal = index + 1;
      return sltProjection(id, {
        visibility: ordinal <= 70 ? "global_author_pool" : "branch_scoped",
        branchId: ordinal <= 70 ? null : "BR-999",
        cooldown: selectedCooldownIds.has(id) ? 2 : 0,
        mysteryAuthority: ordinal >= 11 && ordinal <= 15 ? "canon_candidate" : "none"
      });
    }),
    edges: [
      ...storyletIds.slice(0, 40).map((id) => edge(id, "storylet_compatible_driver", PLAYER_DRIVER)),
      ...storyletIds.slice(40, 70).map((id) => edge(id, "storylet_compatible_driver", "npc_action")),
      ...storyletIds.slice(0, 30).map((id) => edge(id, "storylet_action_family", "investigate")),
      ...storyletIds.slice(30, 40).map((id) => edge(id, "storylet_action_family", "harm")),
      ...storyletIds.slice(0, 25).map((id) => edge(id, "storylet_predicate_pred", "record_active")),
      ...storyletIds.slice(25, 30).map((id) => edge(id, "storylet_predicate_pred", "")),
      ...storyletIds.slice(0, 20).map((id) => edge(id, "storylet_predicate_class", ACTIVE_RECORD_CLASS)),
      ...storyletIds.slice(20, 25).map((id) => edge(id, "storylet_predicate_class", "story_secret_record")),
      ...storyletIds.slice(15, 20).map((id) => edge(id, "storylet_predicate_ref", "STOBJ-99"))
    ]
  });
}

test("SPEC-81 §9.2 limits the 1000-SLT shortlist and full-body reads to max_candidates", async () => {
  const root = createTempRepoRoot();

  try {
    const fixture = buildGeneratedPoolWorld(root);
    const expectedPoolSize = fixture.storyletIds.length;

    const candidates = await withRepoRoot(root, () =>
      selectStoryletCandidates({
        world_slug: WORLD,
        story_slug: STORY,
        parent_page_id: "PG-1",
        turn_driver: {
          kind: PLAYER_DRIVER,
          initiator: "STCHAR-1",
          driver_records: ["STCHAR-1"]
        },
        intent_signature: {
          action_families: ["investigate"]
        },
        max_candidates: 24
      })
    );

    assert.ok(!("code" in candidates));
    assert.equal(candidates.filter_trace.pool_total, expectedPoolSize);
    assert.equal(candidates.shortlisted_candidate_ids.length, 24);
    assert.equal(candidates.requires_full_body_ids.length, 24);
    assert.ok(
      candidates.shortlisted_projection_records.every((record) => !("body" in record) && !("full_body" in record))
    );

    const fullBodies = await withRepoRoot(root, () =>
      getRecords({
        world_slug: WORLD,
        story_slug: STORY,
        record_ids: candidates.requires_full_body_ids
      })
    );

    assert.ok(!("code" in fullBodies));
    assert.equal(fullBodies.delivery_status, "inline");
    if (fullBodies.delivery_status !== "inline") {
      assert.fail("get_records should remain inline for the SPEC-81 shortlist");
    }
    assert.equal(fullBodies.records.length, candidates.requires_full_body_ids.length);
    assert.ok(fullBodies.records.every((record) => record.found));
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("SPEC-81 §9.3 reports deterministic filter-trace counts for a hand-counted pool", async () => {
  const root = createTempRepoRoot();

  try {
    buildHandCountedWorld(root);

    const result = await withRepoRoot(root, () =>
      selectStoryletCandidates({
        world_slug: WORLD,
        story_slug: STORY,
        parent_page_id: "PG-1",
        turn_driver: {
          kind: PLAYER_DRIVER,
          initiator: "STCHAR-1",
          driver_records: ["STCHAR-1"]
        },
        intent_signature: {
          action_families: ["investigate"]
        },
        max_candidates: 24
      })
    );

    assert.ok(!("code" in result));
    assert.deepEqual(result.filter_trace, {
      pool_total: 100,
      after_scope: 70,
      after_driver_kind: 40,
      after_action_family: 30,
      after_predicate_shape: 25,
      after_predicate_class: 20,
      after_source_record_id: 15,
      after_mystery_policy: 10,
      after_cooldown: 8,
      cooldown_active_samples: [
        {
          slt_id: "SLT-10",
          last_selected_on_page: "PG-1",
          distance: 1,
          cooldown_pages: 2
        },
        {
          slt_id: "SLT-9",
          last_selected_on_page: "PG-1",
          distance: 1,
          cooldown_pages: 2
        }
      ]
    });
    assert.equal(result.shortlisted_candidate_ids.length, 8);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("SPEC-81 §9.6 keeps list_records(include_full_body=true) backward compatible", async () => {
  const root = createTempRepoRoot();

  try {
    const fixture = buildGeneratedPoolWorld(root);
    const expectedPoolSize = fixture.storyletIds.length;

    const result = await withRepoRoot(root, () =>
      listRecords({
        world_slug: WORLD,
        story_slug: STORY,
        record_type: "storylet_record",
        include_full_body: true
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.total, expectedPoolSize);
    assert.equal(result.records.length, expectedPoolSize);
    assert.ok(result.records.every((record) => "body" in record));
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("SPEC-81 §9.7 context packets expose the 50-cap pool summary and 24-cap shortlist", async () => {
  const root = createTempRepoRoot();

  try {
    const fixture = buildGeneratedPoolWorld(root);
    const expectedPoolSize = fixture.storyletIds.length;

    const result = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "story_turn_cycle",
        world_slug: WORLD,
        story_slug: STORY,
        seed_nodes: ["CF-1"],
        parent_page_id: "PG-1",
        token_budget: 18000
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.story_bundle_context?.storylet_pool_summary.total, expectedPoolSize);
    assert.equal(result.story_bundle_context?.storylet_pool_summary.visible_records.length, 50);
    assert.equal(result.story_bundle_context?.selection_shortlist?.parent_page_id, "PG-1");
    assert.equal(result.story_bundle_context?.selection_shortlist?.max_candidates, 24);
    assert.equal(result.story_bundle_context?.selection_shortlist?.shortlisted_candidate_ids.length, 24);
    assert.equal(
      result.story_bundle_context?.selection_shortlist?.shortlisted_projection_records.some(
        (record) => "body" in record || "full_body" in record
      ),
      false
    );
    assert.equal(result.story_bundle_context?.selection_shortlist?.requires_full_body_ids.length, 24);
  } finally {
    destroyTempRepoRoot(root);
  }
});
