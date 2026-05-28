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
  rawBranchPrefix?: string | null;
  moveFamily?: string;
  urgency?: string | null;
  cooldown?: number;
  mysteryAuthority?: string;
}) {
  return {
    node_id: storyNodeId(id),
    world_slug: WORLD,
    story_slug: STORY,
    slt_scope_visibility: fields.visibility ?? "global_author_pool",
    slt_scope_branch_id: fields.branchId ?? null,
    slt_scope_branch_path_prefix: fields.rawBranchPrefix ?? (
      fields.branchPrefix === undefined || fields.branchPrefix === null
        ? null
        : JSON.stringify(fields.branchPrefix)
    ),
    slt_provenance_origin: "manual_authoring",
    slt_move_family: fields.moveFamily ?? "investigation",
    slt_saliency_urgency: fields.urgency === undefined ? "medium" : fields.urgency,
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
  const storylets = Array.from({ length: 10 }, (_, index) => storyletNode(`SLT-${index + 1}`));
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
      sltProjection("SLT-9", { cooldown: 2 }),
      sltProjection("SLT-10", {})
    ],
    edges: [
      ...["SLT-1", "SLT-2", "SLT-3", "SLT-5", "SLT-6", "SLT-7", "SLT-8", "SLT-9"].map((id) =>
        edge(id, "storylet_compatible_driver", "player_action")
      ),
      edge("SLT-10", "storylet_compatible_driver", "player_action"),
      edge("SLT-4", "storylet_compatible_driver", "npc_action"),
      ...["SLT-1", "SLT-3", "SLT-4", "SLT-6", "SLT-7", "SLT-8", "SLT-9"].map((id) =>
        edge(id, "storylet_action_family", "investigate")
      ),
      edge("SLT-2", "storylet_action_family", "communicate"),
      edge("SLT-5", "storylet_action_family", "harm"),
      edge("SLT-10", "storylet_action_family", "investigate"),
      ...["SLT-1", "SLT-3", "SLT-4", "SLT-5", "SLT-7", "SLT-8", "SLT-9"].map((id) =>
        edge(id, "storylet_predicate_pred", "record_active")
      ),
      edge("SLT-2", "storylet_predicate_pred", "emotion_active"),
      edge("SLT-6", "storylet_predicate_pred", "record_active"),
      edge("SLT-10", "storylet_predicate_pred", ""),
      ...["SLT-1", "SLT-3", "SLT-4", "SLT-5", "SLT-7", "SLT-8", "SLT-9"].map((id) =>
        edge(id, "storylet_predicate_class", "story_character_authority_record")
      ),
      edge("SLT-2", "storylet_predicate_class", "story_emotion_record"),
      edge("SLT-6", "storylet_predicate_class", "story_secret_record"),
      edge("SLT-10", "storylet_predicate_class", "story_character_authority_record"),
      edge("SLT-2", "storylet_predicate_ref", "STEMO-1"),
      edge("SLT-7", "storylet_predicate_ref", "STOBJ-99")
    ]
  });
}

function buildScopeBoundaryWorld(root: string, input: {
  pageId: string;
  branchId: string | null;
  branchPath: string[];
  projections: ReturnType<typeof sltProjection>[];
}): void {
  const branchPath = input.branchPath.length === 0 ? "[]" : `[${input.branchPath.join(", ")}]`;
  seedWorld(root, {
    worldSlug: WORLD,
    nodes: [
      storyNode(
        input.pageId,
        "page_record",
        [
          `id: ${input.pageId}`,
          `branch_id: ${input.branchId ?? "null"}`,
          `branch_path: ${branchPath}`,
          "state_snapshot:",
          "  active_records: {}",
          "  unresolved_mystery_claims: []",
          ""
        ].join("\n")
      ),
      ...input.projections.map((projection) => storyletNode(projection.node_id.replace(`${STORY}:`, "")))
    ],
    sltProjections: input.projections,
    edges: input.projections.map((projection) =>
      edge(projection.node_id.replace(`${STORY}:`, ""), "storylet_compatible_driver", "player_action")
    )
  });
}

async function selectScopeBoundaryCandidates(root: string, parentPageId: string) {
  return withRepoRoot(root, () =>
    selectStoryletCandidates({
      world_slug: WORLD,
      story_slug: STORY,
      parent_page_id: parentPageId,
      turn_driver: {
        kind: "player_action",
        driver_records: []
      },
      max_candidates: 24
    })
  );
}

function buildExistentialCandidateWorld(root: string): void {
  seedWorld(root, {
    worldSlug: WORLD,
    nodes: [
      storyNode(
        "PG-6",
        "page_record",
        [
          "id: PG-6",
          "branch_id: BR-1",
          "branch_path: [PG-1, PG-6]",
          "state_snapshot:",
          "  active_records:",
          "    STQ: [STQ-5]",
          "    STINT: [STINT-10]",
          "    STEMO: [STEMO-15]",
          "    SREL: [SREL-20]",
          ""
        ].join("\n")
      ),
      storyNode("STQ-5", "story_question_record", "id: STQ-5\nstatus: open\n"),
      storyNode("STINT-10", "intention_record", "id: STINT-10\nstatus: active\n"),
      storyNode("STEMO-15", "story_emotion_record", "id: STEMO-15\nstatus: active\n"),
      storyNode("SREL-20", "relationship_record_story", "id: SREL-20\nstatus: active\n"),
      storyletNode("SLT-42")
    ],
    sltProjections: [
      sltProjection("SLT-42", { urgency: "high", moveFamily: "response" })
    ],
    edges: [
      edge("SLT-42", "storylet_compatible_driver", "npc_action"),
      edge("SLT-42", "storylet_action_family", "communicate"),
      edge("SLT-42", "storylet_predicate_pred", "any_story_question_open"),
      edge("SLT-42", "storylet_predicate_pred", "any_intention"),
      edge("SLT-42", "storylet_predicate_pred", "any_emotion_active"),
      edge("SLT-42", "storylet_predicate_pred", "any_relationship_axis"),
      edge("SLT-42", "storylet_predicate_class", "story_question_record"),
      edge("SLT-42", "storylet_predicate_class", "intention_record"),
      edge("SLT-42", "storylet_predicate_class", "story_emotion_record"),
      edge("SLT-42", "storylet_predicate_class", "relationship_record_story")
    ]
  });
}

function buildPredicateClassCapWorld(root: string): void {
  const sltIds = ["SLT-1", "SLT-2", "SLT-3", "SLT-4", "SLT-5"];
  seedWorld(root, {
    worldSlug: WORLD,
    nodes: [
      storyNode(
        "PG-1",
        "page_record",
        [
          "id: PG-1",
          "branch_id: BR-1",
          "branch_path: [PG-1]",
          "state_snapshot:",
          "  active_records:",
          "    STCHAR: [STCHAR-1]",
          ""
        ].join("\n")
      ),
      storyNode("STCHAR-1", "story_character_authority_record", "---\nid: STCHAR-1\n---\n"),
      ...sltIds.map((id) => storyletNode(id))
    ],
    sltProjections: sltIds.map((id) => sltProjection(id, {})),
    edges: sltIds.flatMap((id) => [
      edge(id, "storylet_compatible_driver", "player_action"),
      edge(id, "storylet_action_family", "investigate"),
      edge(id, "storylet_predicate_pred", "record_active"),
      edge(id, "storylet_predicate_class", "story_secret_record")
    ])
  });
}

function buildGlobalPoolStoryLocalSourceRefWorld(root: string): void {
  seedWorld(root, {
    worldSlug: WORLD,
    nodes: [
      storyNode(
        "PG-SOURCE",
        "page_record",
        [
          "id: PG-SOURCE",
          "branch_id: BR-1",
          "branch_path: [PG-SOURCE]",
          "state_snapshot:",
          "  active_records:",
          "    STOBJ: [STOBJ-1]",
          "  unresolved_mystery_claims: []",
          ""
        ].join("\n")
      ),
      storyNode("STOBJ-1", "story_object_record", "id: STOBJ-1\nstatus: active\n"),
      storyletNode("SLT-77")
    ],
    sltProjections: [
      sltProjection("SLT-77", {})
    ],
    edges: [
      edge("SLT-77", "storylet_compatible_driver", "player_action"),
      edge("SLT-77", "storylet_action_family", "investigate"),
      edge("SLT-77", "storylet_predicate_pred", "record_active"),
      edge("SLT-77", "storylet_predicate_class", "story_object_record"),
      edge("SLT-77", "storylet_predicate_ref", "STOBJ-1")
    ]
  });
}

function buildMalformedSnapshotWorld(root: string, bodyLines: string[]): void {
  seedWorld(root, {
    worldSlug: WORLD,
    nodes: [
      storyNode("PG-MALFORMED", "page_record", [...bodyLines, ""].join("\n")),
      storyletNode("SLT-88"),
      storyletNode("SLT-89")
    ],
    sltProjections: [
      sltProjection("SLT-88", { urgency: "high" }),
      sltProjection("SLT-89", {
        visibility: "branch_prefix_scoped",
        branchId: "BR-1",
        branchPrefix: ["PG-MALFORMED"],
        urgency: "medium"
      })
    ],
    edges: [
      edge("SLT-88", "storylet_compatible_driver", "player_action"),
      edge("SLT-88", "storylet_action_family", "investigate"),
      edge("SLT-88", "storylet_predicate_pred", "record_active"),
      edge("SLT-89", "storylet_compatible_driver", "player_action"),
      edge("SLT-89", "storylet_action_family", "investigate"),
      edge("SLT-89", "storylet_predicate_pred", "record_active")
    ]
  });
}

function buildRankingWorld(
  root: string,
  projections: Array<{
    id: string;
    moveFamily: string;
    urgency?: string | null;
  }>
): void {
  seedWorld(root, {
    worldSlug: WORLD,
    nodes: [
      storyNode(
        "PG-RANK",
        "page_record",
        [
          "id: PG-RANK",
          "branch_id: BR-RANK",
          "branch_path: [PG-RANK]",
          "state_snapshot:",
          "  active_records:",
          "    STCHAR: [STCHAR-1]",
          ""
        ].join("\n")
      ),
      storyNode("STCHAR-1", "story_character_authority_record", "---\nid: STCHAR-1\n---\n"),
      ...projections.map(({ id }) => storyletNode(id))
    ],
    sltProjections: projections.map(({ id, moveFamily, urgency }) =>
      sltProjection(id, urgency === undefined ? { moveFamily } : { moveFamily, urgency })
    ),
    edges: projections.flatMap(({ id }) => [
      edge(id, "storylet_compatible_driver", "player_action"),
      edge(id, "storylet_predicate_pred", "record_active"),
      edge(id, "storylet_predicate_class", "story_character_authority_record")
    ])
  });
}

async function selectRankingCandidates(root: string, maxCandidates = 24) {
  return withRepoRoot(root, () =>
    selectStoryletCandidates({
      world_slug: WORLD,
      story_slug: STORY,
      parent_page_id: "PG-RANK",
      turn_driver: {
        kind: "player_action",
        initiator: "STENT-1",
        driver_records: ["STCHAR-1"]
      },
      max_candidates: maxCandidates
    })
  );
}

test("selectStoryletCandidates treats an empty genesis branch path as outside every branch prefix", async () => {
  const root = createTempRepoRoot();

  try {
    buildScopeBoundaryWorld(root, {
      pageId: "PG-GENESIS",
      branchId: null,
      branchPath: [],
      projections: [
        sltProjection("SLT-1", {}),
        sltProjection("SLT-2", {
          visibility: "branch_prefix_scoped",
          branchId: "BR-1",
          branchPrefix: ["PG-1"]
        })
      ]
    });

    const result = await selectScopeBoundaryCandidates(root, "PG-GENESIS");

    assert.ok(!("code" in result));
    assert.equal(result.filter_trace.pool_total, 2);
    assert.equal(result.filter_trace.after_scope, 1);
    assert.deepEqual(result.shortlisted_candidate_ids, ["SLT-1"]);
    assert.deepEqual(result.filter_trace.scope_rejected_samples, [
      {
        slt_id: "SLT-2",
        reason: "candidate scope 'branch_prefix_scoped' does not match parent page branch context",
        evidence: {
          slt_scope_visibility: "branch_prefix_scoped",
          branch_id: "BR-1",
          branch_path_prefix: JSON.stringify(["PG-1"]),
          parent_branch_id: null,
          parent_branch_path: []
        }
      }
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("selectStoryletCandidates rejects branch-scoped SLTs when the parent branch_id is null", async () => {
  const root = createTempRepoRoot();

  try {
    buildScopeBoundaryWorld(root, {
      pageId: "PG-NULL-BRANCH",
      branchId: null,
      branchPath: ["PG-NULL-BRANCH"],
      projections: [
        sltProjection("SLT-1", {}),
        sltProjection("SLT-2", { visibility: "branch_scoped", branchId: "BR-1" })
      ]
    });

    const result = await selectScopeBoundaryCandidates(root, "PG-NULL-BRANCH");

    assert.ok(!("code" in result));
    assert.equal(result.filter_trace.after_scope, 1);
    assert.deepEqual(result.shortlisted_candidate_ids, ["SLT-1"]);
    assert.deepEqual(result.filter_trace.scope_rejected_samples, [
      {
        slt_id: "SLT-2",
        reason: "candidate scope 'branch_scoped' does not match parent page branch context",
        evidence: {
          slt_scope_visibility: "branch_scoped",
          branch_id: "BR-1",
          branch_path_prefix: null,
          parent_branch_id: null,
          parent_branch_path: ["PG-NULL-BRANCH"]
        }
      }
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("selectStoryletCandidates rejects malformed branch-prefix JSON without throwing", async () => {
  const root = createTempRepoRoot();

  try {
    buildScopeBoundaryWorld(root, {
      pageId: "PG-2",
      branchId: "BR-1",
      branchPath: ["PG-1", "PG-2"],
      projections: [
        sltProjection("SLT-1", {}),
        sltProjection("SLT-2", {
          visibility: "branch_prefix_scoped",
          branchId: "BR-1",
          rawBranchPrefix: "[\"PG-1\""
        })
      ]
    });

    const result = await selectScopeBoundaryCandidates(root, "PG-2");

    assert.ok(!("code" in result));
    assert.equal(result.filter_trace.after_scope, 1);
    assert.deepEqual(result.shortlisted_candidate_ids, ["SLT-1"]);
    assert.deepEqual(result.filter_trace.scope_rejected_samples, [
      {
        slt_id: "SLT-2",
        reason: "candidate scope 'branch_prefix_scoped' does not match parent page branch context",
        evidence: {
          slt_scope_visibility: "branch_prefix_scoped",
          branch_id: "BR-1",
          branch_path_prefix: "[\"PG-1\"",
          parent_branch_id: "BR-1",
          parent_branch_path: ["PG-1", "PG-2"]
        }
      }
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("selectStoryletCandidates rejects global-pool SLTs that carry existing story-local source refs", async () => {
  const root = createTempRepoRoot();

  try {
    buildGlobalPoolStoryLocalSourceRefWorld(root);

    const result = await withRepoRoot(root, () =>
      selectStoryletCandidates({
        world_slug: WORLD,
        story_slug: STORY,
        parent_page_id: "PG-SOURCE",
        turn_driver: {
          kind: "player_action",
          driver_records: ["STOBJ-1"]
        },
        intent_signature: {
          action_families: ["investigate"],
          grounding_record_ids: ["STOBJ-1"]
        },
        max_candidates: 24
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.filter_trace.after_source_record_id, 0);
    assert.deepEqual(result.filter_trace.source_record_id_rejected_samples, [
      {
        slt_id: "SLT-77",
        reason: "global author-pool storylet carries story-local exact source refs",
        evidence: {
          indexed_source_record_ids: ["STOBJ-1"],
          requested_grounding_record_ids: ["STOBJ-1"]
        }
      }
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("selectStoryletCandidates degrades malformed parent-page state snapshots without throwing", async () => {
  const cases: Array<{ name: string; bodyLines: string[]; expectedBranchPath: string[] }> = [
    {
      name: "null snapshot",
      bodyLines: [
        "id: PG-MALFORMED",
        "branch_id: BR-1",
        "branch_path: [PG-MALFORMED]",
        "state_snapshot: null"
      ],
      expectedBranchPath: ["PG-MALFORMED"]
    },
    {
      name: "array snapshot and non-string branch id",
      bodyLines: [
        "id: PG-MALFORMED",
        "branch_id: [BR-1]",
        "branch_path: [PG-MALFORMED]",
        "state_snapshot: []"
      ],
      expectedBranchPath: ["PG-MALFORMED"]
    },
    {
      name: "array active records and object mystery claims",
      bodyLines: [
        "id: PG-MALFORMED",
        "branch_id: BR-1",
        "branch_path: [PG-MALFORMED]",
        "state_snapshot:",
        "  active_records: [STCHAR-1]",
        "  unresolved_mystery_claims:",
        "    authority: apparent"
      ],
      expectedBranchPath: ["PG-MALFORMED"]
    },
    {
      name: "unknown active-record prefix and malformed mystery entries",
      bodyLines: [
        "id: PG-MALFORMED",
        "branch_id: BR-1",
        "branch_path: PG-MALFORMED",
        "state_snapshot:",
        "  active_records:",
        "    UNKNOWN: [UNKNOWN-1]",
        "  unresolved_mystery_claims:",
        "    - mystery_id: M-1",
        "    - authority: 42"
      ],
      expectedBranchPath: []
    }
  ];

  for (const testCase of cases) {
    const root = createTempRepoRoot();

    try {
      buildMalformedSnapshotWorld(root, testCase.bodyLines);

      const result = await withRepoRoot(root, () =>
        selectStoryletCandidates({
          world_slug: WORLD,
          story_slug: STORY,
          parent_page_id: "PG-MALFORMED",
          turn_driver: {
            kind: "player_action",
            driver_records: []
          },
          intent_signature: {
            action_families: ["investigate"]
          },
          max_candidates: 24
        })
      );

      assert.ok(!("code" in result), testCase.name);
      assert.equal(result.filter_trace.pool_total, 2, testCase.name);
      assert.deepEqual(
        result.shortlisted_candidate_ids,
        testCase.expectedBranchPath.length > 0 ? ["SLT-88", "SLT-89"] : ["SLT-88"],
        testCase.name
      );
      assert.deepEqual(
        result.filter_trace.scope_rejected_samples.map((sample) => ({
          slt_id: sample.slt_id,
          parent_branch_id: sample.evidence.parent_branch_id,
          parent_branch_path: sample.evidence.parent_branch_path
        })),
        testCase.expectedBranchPath.length > 0
          ? []
          : [
              {
                slt_id: "SLT-89",
                parent_branch_id: "BR-1",
                parent_branch_path: []
              }
            ],
        testCase.name
      );
      assert.deepEqual(result.filter_trace.predicate_class_rejected_samples, [], testCase.name);
      assert.deepEqual(result.filter_trace.mystery_policy_rejected_samples, [], testCase.name);
      assert.deepEqual(
        result.shortlisted_projection_records.map((record) => record.id),
        result.shortlisted_candidate_ids,
        testCase.name
      );
    } finally {
      destroyTempRepoRoot(root);
    }
  }
});

test("selectStoryletCandidates returns record_not_found when the parent page is absent", async () => {
  const root = createTempRepoRoot();

  try {
    buildCandidateWorld(root);

    const result = await withRepoRoot(root, () =>
      selectStoryletCandidates({
        world_slug: WORLD,
        story_slug: STORY,
        parent_page_id: "PG-MISSING",
        turn_driver: {
          kind: "player_action",
          driver_records: []
        },
        max_candidates: 24
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "record_not_found");
    assert.equal(result.details?.field, "parent_page_id");
    assert.equal(result.details?.parent_page_id, "PG-MISSING");
    assert.equal(result.details?.world_slug, WORLD);
    assert.equal(result.details?.story_slug, STORY);
  } finally {
    destroyTempRepoRoot(root);
  }
});

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
      pool_total: 10,
      after_scope: 9,
      after_driver_kind: 8,
      after_action_family: 7,
      after_predicate_shape: 6,
      after_predicate_class: 5,
      after_source_record_id: 4,
      after_mystery_policy: 3,
      after_cooldown: 2,
      scope_rejected_samples: [
        {
          slt_id: "SLT-3",
          reason: "candidate scope 'branch_scoped' does not match parent page branch context",
          evidence: {
            slt_scope_visibility: "branch_scoped",
            branch_id: "BR-2",
            branch_path_prefix: null,
            parent_branch_id: "BR-1",
            parent_branch_path: ["PG-1", "PG-2"]
          }
        }
      ],
      driver_kind_rejected_samples: [
        {
          slt_id: "SLT-4",
          reason: "candidate compatible turn drivers do not include requested driver kind",
          evidence: {
            compatible_drivers: ["npc_action"],
            requested_driver_kind: "player_action"
          }
        }
      ],
      action_family_rejected_samples: [
        {
          slt_id: "SLT-5",
          reason: "candidate action families do not intersect requested intent action families",
          evidence: {
            candidate_action_families: ["harm"],
            requested_action_families: ["investigate", "communicate"]
          }
        }
      ],
      predicate_shape_rejected_samples: [
        {
          slt_id: "SLT-10",
          reason: "no concrete predicate names indexed",
          evidence: {
            predicate_pred_names: [""]
          }
        }
      ],
      predicate_class_rejected_samples: [
        {
          slt_id: "SLT-6",
          reason: "indexed predicate classes do not intersect requested or active record classes",
          evidence: {
            indexed_classes: ["story_secret_record"],
            requested_classes: ["story_character_authority_record", "story_emotion_record"]
          }
        }
      ],
      source_record_id_rejected_samples: [
        {
          slt_id: "SLT-7",
          reason: "indexed predicate source refs are not resolvable in the current world/story index",
          evidence: {
            indexed_source_record_ids: ["STOBJ-99"],
            missing_source_record_ids: ["STOBJ-99"],
            requested_grounding_record_ids: []
          }
        }
      ],
      mystery_policy_rejected_samples: [
        {
          slt_id: "SLT-8",
          reason: "candidate mystery policy authority is not present in unresolved parent-page mystery claims",
          evidence: {
            allowed_authority_classes: ["canon_candidate"],
            unresolved_mystery_claims: ["apparent"]
          }
        }
      ],
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

test("selectStoryletCandidates ranks round-robin across move families within an urgency band", async () => {
  const root = createTempRepoRoot();

  try {
    buildRankingWorld(root, [
      { id: "SLT-1", moveFamily: "alpha", urgency: "medium" },
      { id: "SLT-2", moveFamily: "beta", urgency: "medium" },
      { id: "SLT-3", moveFamily: "gamma", urgency: "medium" },
      { id: "SLT-4", moveFamily: "alpha", urgency: "medium" },
      { id: "SLT-5", moveFamily: "gamma", urgency: "medium" }
    ]);

    const result = await selectRankingCandidates(root);

    assert.ok(!("code" in result));
    assert.deepEqual(result.shortlisted_candidate_ids, ["SLT-1", "SLT-2", "SLT-3", "SLT-4", "SLT-5"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("selectStoryletCandidates ranks higher urgency before lower urgency regardless of family", async () => {
  const root = createTempRepoRoot();

  try {
    buildRankingWorld(root, [
      { id: "SLT-1", moveFamily: "alpha", urgency: "low" },
      { id: "SLT-2", moveFamily: "zeta", urgency: "medium" }
    ]);

    const result = await selectRankingCandidates(root);

    assert.ok(!("code" in result));
    assert.deepEqual(result.shortlisted_candidate_ids, ["SLT-2", "SLT-1"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("selectStoryletCandidates breaks ties by node_id within the same urgency and family", async () => {
  const root = createTempRepoRoot();

  try {
    buildRankingWorld(root, [
      { id: "SLT-3", moveFamily: "alpha", urgency: "medium" },
      { id: "SLT-10", moveFamily: "alpha", urgency: "medium" }
    ]);

    const result = await selectRankingCandidates(root);

    assert.ok(!("code" in result));
    assert.deepEqual(result.shortlisted_candidate_ids, ["SLT-10", "SLT-3"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("selectStoryletCandidates truncation preserves rank order", async () => {
  const root = createTempRepoRoot();

  try {
    buildRankingWorld(root, [
      { id: "SLT-1", moveFamily: "zeta", urgency: "low" },
      { id: "SLT-2", moveFamily: "alpha", urgency: "high" },
      { id: "SLT-3", moveFamily: "beta", urgency: "high" },
      { id: "SLT-4", moveFamily: "alpha", urgency: "high" },
      { id: "SLT-5", moveFamily: "gamma", urgency: "medium" },
      { id: "SLT-6", moveFamily: "beta", urgency: "medium" },
      { id: "SLT-7", moveFamily: "alpha", urgency: "medium" },
      { id: "SLT-8", moveFamily: "delta", urgency: "low" },
      { id: "SLT-9", moveFamily: "epsilon", urgency: "unknown" },
      { id: "SLT-10", moveFamily: "omega", urgency: null }
    ]);

    const result = await selectRankingCandidates(root, 3);

    assert.ok(!("code" in result));
    assert.deepEqual(result.shortlisted_candidate_ids, ["SLT-2", "SLT-3", "SLT-4"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("selectStoryletCandidates places unknown urgency last", async () => {
  const root = createTempRepoRoot();

  try {
    buildRankingWorld(root, [
      { id: "SLT-1", moveFamily: "alpha", urgency: "unknown" },
      { id: "SLT-2", moveFamily: "beta", urgency: null },
      { id: "SLT-3", moveFamily: "gamma", urgency: "low" }
    ]);

    const result = await selectRankingCandidates(root);

    assert.ok(!("code" in result));
    assert.deepEqual(result.shortlisted_candidate_ids, ["SLT-3", "SLT-1", "SLT-2"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("selectStoryletCandidates populates rejected samples by default", async () => {
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
    assert.deepEqual(
      result.filter_trace.scope_rejected_samples.map((sample) => sample.slt_id),
      ["SLT-3"]
    );
    assert.deepEqual(
      result.filter_trace.driver_kind_rejected_samples.map((sample) => sample.slt_id),
      ["SLT-4"]
    );
    assert.deepEqual(
      result.filter_trace.action_family_rejected_samples.map((sample) => sample.slt_id),
      ["SLT-5"]
    );
    assert.deepEqual(
      result.filter_trace.predicate_shape_rejected_samples.map((sample) => sample.slt_id),
      ["SLT-10"]
    );
    assert.deepEqual(
      result.filter_trace.predicate_class_rejected_samples.map((sample) => sample.slt_id),
      ["SLT-6"]
    );
    assert.deepEqual(
      result.filter_trace.source_record_id_rejected_samples.map((sample) => sample.slt_id),
      ["SLT-7"]
    );
    assert.deepEqual(
      result.filter_trace.mystery_policy_rejected_samples.map((sample) => sample.slt_id),
      ["SLT-8"]
    );
    assert.deepEqual(
      result.filter_trace.cooldown_active_samples.map((sample) => sample.slt_id),
      ["SLT-9"]
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("selectStoryletCandidates keeps existential SLTs whose predicate classes intersect requested grounding classes", async () => {
  const root = createTempRepoRoot();

  try {
    buildExistentialCandidateWorld(root);

    const result = await withRepoRoot(root, () =>
      selectStoryletCandidates({
        world_slug: WORLD,
        story_slug: STORY,
        parent_page_id: "PG-6",
        turn_driver: {
          kind: "npc_action",
          initiator: "STENT-2",
          driver_records: ["STQ-5", "STINT-10", "STEMO-15", "SREL-20"]
        },
        intent_signature: {
          action_families: ["communicate"],
          grounding_record_classes: [
            "story_question_record",
            "intention_record",
            "story_emotion_record",
            "relationship_record_story"
          ]
        },
        max_candidates: 24
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.filter_trace.after_predicate_class, 1);
    assert.deepEqual(result.filter_trace.predicate_class_rejected_samples, []);
    assert.deepEqual(result.shortlisted_candidate_ids, ["SLT-42"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("selectStoryletCandidates samples predicate-class rejection evidence for existential SLTs", async () => {
  const root = createTempRepoRoot();

  try {
    buildExistentialCandidateWorld(root);

    const result = await withRepoRoot(root, () =>
      selectStoryletCandidates({
        world_slug: WORLD,
        story_slug: STORY,
        parent_page_id: "PG-6",
        turn_driver: {
          kind: "npc_action",
          initiator: "STENT-2",
          driver_records: ["STCHAR-1"]
        },
        intent_signature: {
          action_families: ["communicate"],
          grounding_record_classes: ["story_character_authority_record"]
        },
        max_candidates: 24
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.filter_trace.after_predicate_class, 0);
    assert.deepEqual(result.shortlisted_candidate_ids, []);
    assert.deepEqual(result.filter_trace.predicate_class_rejected_samples, [
      {
        slt_id: "SLT-42",
        reason: "indexed predicate classes do not intersect requested or active record classes",
        evidence: {
          indexed_classes: [
            "intention_record",
            "relationship_record_story",
            "story_emotion_record",
            "story_question_record"
          ],
          requested_classes: ["story_character_authority_record"]
        }
      }
    ]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("selectStoryletCandidates caps predicate-class rejection samples at three entries", async () => {
  const root = createTempRepoRoot();

  try {
    buildPredicateClassCapWorld(root);

    const result = await withRepoRoot(root, () =>
      selectStoryletCandidates({
        world_slug: WORLD,
        story_slug: STORY,
        parent_page_id: "PG-1",
        turn_driver: {
          kind: "player_action",
          driver_records: ["STCHAR-1"]
        },
        intent_signature: {
          action_families: ["investigate"]
        },
        max_candidates: 24
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.filter_trace.after_predicate_class, 0);
    assert.deepEqual(
      result.filter_trace.predicate_class_rejected_samples.map((sample) => sample.slt_id),
      ["SLT-1", "SLT-2", "SLT-3"]
    );
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("selectStoryletCandidates wildcard-passes existential SLTs when grounding ids are supplied", async () => {
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
          action_families: ["investigate"],
          grounding_record_ids: ["STEMO-1"]
        },
        max_candidates: 24
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.filter_trace.after_predicate_class, 4);
    assert.equal(result.filter_trace.after_source_record_id, 3);
    assert.deepEqual(result.shortlisted_candidate_ids, ["SLT-1"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("selectStoryletCandidates preserves exact source-record-id narrowing", async () => {
  const root = createTempRepoRoot();

  try {
    buildCandidateWorld(root);

    const nonIntersecting = await withRepoRoot(root, () =>
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
          action_families: ["communicate"],
          grounding_record_ids: ["STCHAR-1"]
        },
        max_candidates: 24
      })
    );

    assert.ok(!("code" in nonIntersecting));
    assert.equal(nonIntersecting.filter_trace.after_predicate_class, 1);
    assert.equal(nonIntersecting.filter_trace.after_source_record_id, 0);
    assert.deepEqual(nonIntersecting.shortlisted_candidate_ids, []);

    const intersecting = await withRepoRoot(root, () =>
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
          action_families: ["communicate"],
          grounding_record_ids: ["STEMO-1"]
        },
        max_candidates: 24
      })
    );

    assert.ok(!("code" in intersecting));
    assert.equal(intersecting.filter_trace.after_predicate_class, 1);
    assert.equal(intersecting.filter_trace.after_source_record_id, 1);
    assert.deepEqual(intersecting.shortlisted_candidate_ids, ["SLT-2"]);
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
