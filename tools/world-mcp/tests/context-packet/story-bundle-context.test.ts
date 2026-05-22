import assert from "node:assert/strict";
import test from "node:test";

import { assembleContextPacket } from "../../src/context-packet/assemble.js";
import { summarizeStoryBundleContext } from "../../src/context-packet/story-bundle-context.js";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "../tools/_shared.js";
import {
  buildStoryBundleWorld,
  STORY_FIXTURE_SLUG,
  STORY_FIXTURE_WORLD
} from "../tools/story-bundle-fixture.js";

test("story-pipeline context packets include indexed story-bundle context", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

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
    assert.equal(result.task_header.story_slug, STORY_FIXTURE_SLUG);
    assert.ok(result.story_bundle_context !== null);
    assert.equal(result.story_bundle_context.story_slug, STORY_FIXTURE_SLUG);
    assert.equal(result.story_bundle_context.storylet_pool_summary.total, 1);
    assert.equal(result.story_bundle_context.storylet_pool_summary.by_move_family.decision, 1);
    assert.equal(result.story_bundle_context.storylet_pool_summary.by_urgency.high, 1);
    assert.deepEqual(
      result.story_bundle_context.storylet_pool_summary.visible_records.map((record) => record.id),
      ["SLT-21"]
    );
    assert.deepEqual(
      result.story_bundle_context.storylet_pool_summary.visible_records.map((record) => [
        record.move_family,
        record.urgency
      ]),
      [["decision", "high"]]
    );
    assert.deepEqual(
      result.story_bundle_context.open_obligations.map((obligation) => obligation.id),
      ["OBL-1", "OBL-2", "OBL-3", "OBL-4", "OBL-5"]
    );
    assert.deepEqual(
      result.story_bundle_context.open_obligations.map((obligation) => Object.keys(obligation)),
      Array.from({ length: 5 }, () => [
        "id",
        "obligation_kind",
        "description",
        "owed_by",
        "owed_to",
        "urgency",
        "trigger_to_close",
        "status"
      ])
    );
    assert.deepEqual(
      result.story_bundle_context.open_obligations.map((obligation) => [
        obligation.id,
        obligation.obligation_kind,
        obligation.description,
        obligation.owed_by,
        obligation.owed_to,
        obligation.urgency,
        obligation.trigger_to_close,
        obligation.status
      ]),
      [
        [
          "OBL-1",
          "promise",
          "Pay off the loft setup.",
          "STENT-2",
          "public",
          "high",
          "Marla reveals why the loft bell rang.",
          "open"
        ],
        [
          "OBL-2",
          "debt",
          "Marla owes the stairwell watcher a true answer.",
          "STENT-2",
          "group:watch",
          "medium",
          "Marla gives the watcher a true answer.",
          "open"
        ],
        [
          "OBL-3",
          "moral",
          "Marla must decide whether to warn the public.",
          "STENT-2",
          "public",
          "low",
          "The public warning is either made or deliberately withheld.",
          "open"
        ],
        [
          "OBL-4",
          "protection",
          "Marla must keep the loft child unseen.",
          "STENT-2",
          "STENT-2",
          "high",
          "The child is moved beyond the watch patrol.",
          "open"
        ],
        [
          "OBL-5",
          "promise",
          "Marla promised to leave a signal if the roof path is clear.",
          "STENT-2",
          "public",
          "medium",
          "A roof-path signal is left or the promise is superseded.",
          "open"
        ]
      ]
    );
    assert.deepEqual(
      result.story_bundle_context.active_intentions.map((intention) => Object.keys(intention)),
      [
        [
          "id",
          "holder",
          "intent",
          "urgency",
          "expires_when"
        ]
      ]
    );
    assert.deepEqual(result.story_bundle_context.active_intentions, [
      {
        id: "STINT-1",
        holder: "STENT-2",
        intent: "Marla wants to reach the loft window unseen.",
        urgency: "high",
        expires_when: "Marla is seen by the watch patrol."
      }
    ]);
    assert.deepEqual(
      result.story_bundle_context.active_statuses.map((status) => Object.keys(status)),
      [
        [
          "entity",
          "life",
          "agency",
          "location"
        ]
      ]
    );
    assert.deepEqual(result.story_bundle_context.active_statuses, [
      {
        entity: "STENT-2",
        life: "alive",
        agency: "free",
        location: "STLOC-1"
      }
    ]);
    assert.deepEqual(
      result.story_bundle_context.active_beliefs_by_holder.map((group) => Object.keys(group)),
      [
        ["holder", "beliefs"],
        ["holder", "beliefs"]
      ]
    );
    assert.deepEqual(
      result.story_bundle_context.active_beliefs_by_holder.map((group) => [
        group.holder,
        group.beliefs.map((belief) => Object.keys(belief))
      ]),
      [
        [
          "STENT-2",
          [
            [
              "id",
              "claim",
              "belief_mode",
              "truth_relation",
              "confidence",
              "visibility"
            ],
            [
              "id",
              "claim",
              "belief_mode",
              "truth_relation",
              "confidence",
              "visibility"
            ]
          ]
        ],
        [
          "STENT-3",
          [
            [
              "id",
              "claim",
              "belief_mode",
              "truth_relation",
              "confidence",
              "visibility"
            ]
          ]
        ]
      ]
    );
    assert.deepEqual(result.story_bundle_context.active_beliefs_by_holder, [
      {
        holder: "STENT-2",
        beliefs: [
          {
            id: "BEL-1",
            claim: "Marla believes the loft is empty.",
            belief_mode: "believes",
            truth_relation: "false",
            confidence: "likely",
            visibility: "private"
          },
          {
            id: "BEL-2",
            claim: "Marla suspects someone listened at the stairwell.",
            belief_mode: "suspects",
            truth_relation: "unknown",
            confidence: "suspected",
            visibility: "shared"
          }
        ]
      },
      {
        holder: "STENT-3",
        beliefs: [
          {
            id: "BEL-3",
            claim: "The watcher believes Marla heard the bell.",
            belief_mode: "believes",
            truth_relation: "unknown",
            confidence: "medium",
            visibility: "factional"
          }
        ]
      }
    ]);
    assert.deepEqual(result.story_bundle_context.active_relationships_by_participant, [
      {
        participants: ["STENT-2", "STENT-3"],
        axes: [
          {
            axis: "trust",
            value: "low"
          },
          {
            axis: "fear",
            value: "medium"
          }
        ]
      }
    ]);
    assert.deepEqual(
      result.story_bundle_context.active_locations_in_scope.map((location) => Object.keys(location)),
      [["id", "label", "description", "bound_ent"]]
    );
    assert.deepEqual(result.story_bundle_context.active_locations_in_scope, [
      {
        id: "STLOC-1",
        label: "Loft window",
        description: "A narrow window above the old loft.",
        bound_ent: null
      }
    ]);
    assert.deepEqual(
      result.story_bundle_context.active_objects_in_scope.map((object) => Object.keys(object)),
      [["id", "label", "description", "owner", "current_location"]]
    );
    assert.deepEqual(result.story_bundle_context.active_objects_in_scope, [
      {
        id: "STOBJ-1",
        label: "Brass latch",
        description: "A tarnished latch on the loft window.",
        owner: "public",
        current_location: "STLOC-1"
      }
    ]);
    assert.deepEqual(
      result.story_bundle_context.active_story_diegetic_artifacts.map((artifact) =>
        Object.keys(artifact)
      ),
      [
        [
          "id",
          "title",
          "author",
          "genre",
          "intended_audience",
          "circulation",
          "truth_relation",
          "derived_from"
        ]
      ]
    );
    assert.deepEqual(result.story_bundle_context.active_story_diegetic_artifacts, [
      {
        id: "DA-1",
        title: "Loft Bell Note",
        author: "unknown",
        genre: "note",
        intended_audience: "public",
        circulation: "public",
        truth_relation: "unknown",
        derived_from: ["SE-1"]
      }
    ]);
    assert.deepEqual(result.story_bundle_context.active_story_characters, [
      {
        id: "STCHAR-1",
        status: "active",
        bound_stent_ids: ["STENT-2"],
        source_kind: "world_char",
        source_char_id: "CHAR-1",
        profile_revision: 1,
        profile_hash: `sha256:${"b".repeat(64)}`,
        voice_block_hash: `sha256:${"c".repeat(64)}`,
        packet_preview:
          "## Profile Marla Kern keeps her fear below the surface while looking for a clean exit. ## Page-Plan Voice Block Use clipped, observant phrasing and avoid direct world-character dossier text."
      }
    ]);
    assert.deepEqual(
      result.story_bundle_context.active_actor_plans.map((plan) => Object.keys(plan)),
      [
        [
          "id",
          "holder",
          "root_intention",
          "objective",
          "plan_status",
          "current_step_action_family"
        ]
      ]
    );
    assert.deepEqual(result.story_bundle_context.active_actor_plans, [
      {
        id: "STPLAN-1",
        holder: "STENT-2",
        root_intention: "STINT-1",
        objective: "Reach the loft window by using the brass latch before the watcher arrives.",
        plan_status: "active",
        current_step_action_family: "evade"
      }
    ]);
    assert.deepEqual(
      result.story_bundle_context.active_emotional_states.map((emotion) => Object.keys(emotion)),
      [
        [
          "id",
          "holder",
          "status",
          "affect_kind",
          "intensity",
          "behavioral_pressure",
          "agency_effect"
        ],
        [
          "id",
          "holder",
          "status",
          "affect_kind",
          "intensity",
          "behavioral_pressure",
          "agency_effect"
        ]
      ]
    );
    assert.deepEqual(result.story_bundle_context.active_emotional_states, [
      {
        id: "STEMO-1",
        holder: "STENT-2",
        status: "active",
        affect_kind: "anxiety",
        intensity: "high",
        behavioral_pressure: ["conceal", "plan"],
        agency_effect: "constraining"
      },
      {
        id: "STEMO-2",
        holder: "STENT-3",
        status: "dissociated",
        affect_kind: null,
        intensity: null,
        behavioral_pressure: [],
        agency_effect: "none"
      }
    ]);
    assert.deepEqual(
      result.story_bundle_context.active_threads.map((thread) => thread.id),
      ["THR-1"]
    );
    assert.deepEqual(
      result.story_bundle_context.active_clocks.map((clock) => [clock.id, clock.value, clock.max]),
      [["CLK-1", 2, 6]]
    );
    assert.deepEqual(
      result.story_bundle_context.hidden_secrets.map((secret) => [
        secret.id,
        secret.clue_carrier_count,
        secret.discovered_clue_count
      ]),
      [["STSEC-1", 1, 1]]
    );
    assert.deepEqual(
      result.story_bundle_context.open_story_questions.map((question) => [
        question.id,
        question.question_or_setup
      ]),
      [["STQ-1", "Who rang the loft bell?"]]
    );
    assert.deepEqual(result.story_bundle_context.longest_active_branch_path, ["PG-1"]);
    assert.deepEqual(
      result.story_bundle_context.recent_pages_along_longest_active_branch.map((page) => page.id),
      ["PG-1"]
    );
    assert.deepEqual(
      result.story_bundle_context.mysteries_in_play.map((mystery) => mystery.m_id),
      ["M-1"]
    );
    assert.deepEqual(result.story_bundle_context.mystery_evidence_chains, [
      {
        mystery_id: "M-1",
        claims: [
          {
            page_id: "PG-1",
            authority: "apparent",
            status: "clue_added",
            evidence_records: ["SF-1", "SE-1"]
          }
        ]
      }
    ]);
    assert.deepEqual(
      result.story_bundle_context.cast_bind_list.map((entry) => entry.stent_id),
      ["STENT-2"]
    );
    assert.deepEqual(result.story_bundle_context.cast_bind_list[0]?.stchar_id, "STCHAR-1");
    assert.deepEqual(result.story_bundle_context.cast_bind_list[0]?.source_char_id, "CHAR-1");
    assert.deepEqual(result.story_bundle_context.cast_bind_list[0]?.role_in_story, [
      "viewpoint",
      "primary_actor"
    ]);
    assert.deepEqual(result.story_bundle_context.invariants_acknowledged, [
      "INV-social-intimacy"
    ]);

    const storyBundleContextSummary = summarizeStoryBundleContext(result.story_bundle_context);
    assert.deepEqual(storyBundleContextSummary?.active_belief_holders, ["STENT-2", "STENT-3"]);
    assert.deepEqual(storyBundleContextSummary?.active_relationship_participants, [
      ["STENT-2", "STENT-3"]
    ]);
    assert.deepEqual(storyBundleContextSummary?.active_location_ids, ["STLOC-1"]);
    assert.deepEqual(storyBundleContextSummary?.active_object_ids, ["STOBJ-1"]);
    assert.deepEqual(storyBundleContextSummary?.active_story_da_ids, ["DA-1"]);
    assert.deepEqual(storyBundleContextSummary?.active_story_character_ids, ["STCHAR-1"]);
    assert.deepEqual(storyBundleContextSummary?.active_plan_ids, ["STPLAN-1"]);
    assert.deepEqual(storyBundleContextSummary?.active_plan_holders, ["STENT-2"]);
    assert.deepEqual(storyBundleContextSummary?.active_emotion_ids, ["STEMO-1", "STEMO-2"]);
    assert.deepEqual(storyBundleContextSummary?.active_emotion_holders, ["STENT-2", "STENT-3"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("world-canon context packets expose a null story_bundle_context", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "canon_addition",
        world_slug: STORY_FIXTURE_WORLD,
        seed_nodes: ["CF-1"],
        token_budget: 18000
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.task_header.story_slug, null);
    assert.equal(result.story_bundle_context, null);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("story_bootstrap uses story_slug as a target slug without story-bundle context", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      assembleContextPacket({
        task_type: "story_bootstrap",
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: "new-target-story",
        seed_nodes: ["entity:marla-kern"],
        token_budget: 18000
      })
    );

    assert.ok(!("code" in result));
    assert.equal(result.task_header.story_slug, "new-target-story");
    assert.equal(result.story_bundle_context, null);
  } finally {
    destroyTempRepoRoot(root);
  }
});
