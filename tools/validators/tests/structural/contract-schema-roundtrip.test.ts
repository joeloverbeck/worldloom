import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const SCHEMA_ROOT = path.resolve(process.cwd(), "src", "schemas");

const EXPECTED_FIELD_SETS: Record<string, { required: string[]; properties: string[] }> = {
  "story-belief": {
    required: ["id", "story_id", "created_at_page", "holder", "claim", "belief_mode", "truth_relation", "confidence", "visibility", "basis", "consequences"],
    properties: ["record_kind", "id", "story_id", "created_at_page", "supersedes", "holder", "claim", "belief_mode", "truth_relation", "confidence", "visibility", "basis", "consequences"]
  },
  "story-page": {
    required: ["id", "story_id", "branch_id", "parent_page_id", "branch_path", "turn_index", "input", "state_hash_parent", "state_hash", "state_snapshot", "plan", "prose_plan_path", "emitted_choices", "validation_trace"],
    properties: ["record_kind", "id", "story_id", "branch_id", "parent_page_id", "branch_path", "turn_index", "input", "state_hash_parent", "state_hash", "state_snapshot", "plan", "prose_plan_path", "emitted_choices", "validation_trace"]
  },
  "story-event": {
    required: ["id", "story_id", "created_at_page", "parent_page_id", "event_kind", "actor", "commitment", "outcome_route", "world_logic_rationale", "state_delta"],
    properties: ["record_kind", "id", "story_id", "created_at_page", "parent_page_id", "event_kind", "actor", "targets", "commitment", "turn_driver", "outcome_route", "resolution", "world_logic_rationale", "record_introductions", "state_relations", "non_propagation_facts", "state_delta", "promotion_claims"]
  },
  "story-storylet": {
    required: ["id", "story_id", "scope", "title", "move_family", "preconditions", "beats", "exit_options", "saliency", "mystery_policy", "provenance", "grounding"],
    properties: ["record_kind", "id", "story_id", "supersedes", "scope", "created_at_page", "title", "move_family", "preconditions", "beats", "effects", "exit_options", "saliency", "mystery_policy", "provenance", "grounding"]
  },
  "story-entity": {
    required: ["id", "story_id", "created_at_page", "display_name", "bound_stchar_id", "role_in_story"],
    properties: ["record_kind", "id", "story_id", "created_at_page", "supersedes", "display_name", "bound_stchar_id", "role_in_story"]
  },
  "story-character-authority": {
    required: ["id", "story_id", "story_slug", "world_slug", "source_kind", "source_char_id", "source_char_sections_used", "generated_at_page", "created_by_skill", "supersedes", "status", "bound_stent_ids", "profile_revision", "body_schema_version"],
    properties: ["record_kind", "id", "story_id", "story_slug", "world_slug", "source_kind", "source_char_id", "source_char_sections_used", "source_operational_fact_map", "regeneration_reason_class", "story_local_inputs_used", "generated_at_page", "created_by_skill", "supersedes", "superseded_by", "status", "bound_stent_ids", "profile_revision", "body_schema_version"]
  },
  "story-status": {
    required: ["id", "story_id", "created_at_page", "entity", "life", "agency", "location"],
    properties: ["record_kind", "id", "story_id", "created_at_page", "supersedes", "entity", "life", "agency", "location", "derived_from"]
  },
  "story-intention": {
    required: ["id", "story_id", "created_at_page", "holder", "intent", "urgency", "expires_when"],
    properties: ["record_kind", "id", "story_id", "created_at_page", "supersedes", "holder", "intent", "urgency", "expires_when"]
  },
  "story-fact": {
    required: ["id", "story_id", "created_at_page", "statement", "authority"],
    properties: ["record_kind", "id", "story_id", "created_at_page", "supersedes", "statement", "authority", "derived_from"]
  },
  "story-obligation": {
    required: ["id", "story_id", "created_at_page", "status", "obligation_kind", "description", "owed_by", "owed_to", "trigger_to_close", "urgency"],
    properties: ["record_kind", "id", "story_id", "created_at_page", "supersedes", "status", "obligation_kind", "description", "owed_by", "owed_to", "trigger_to_close", "urgency"]
  },
  "story-consequence": {
    required: ["id", "story_id", "created_at_page", "status", "consequence_kind", "description", "resolves_when", "urgency"],
    properties: ["record_kind", "id", "story_id", "created_at_page", "supersedes", "status", "consequence_kind", "description", "urgency", "resolves_when", "derived_from"]
  },
  "story-thread": {
    required: ["id", "story_id", "created_at_page", "status", "title", "summary", "urgency"],
    properties: ["record_kind", "id", "story_id", "created_at_page", "supersedes", "status", "title", "summary", "urgency", "derived_from"]
  },
  "story-relationship": {
    required: ["id", "story_id", "created_at_page", "axis", "participants", "direction", "value", "valence", "description"],
    properties: ["record_kind", "id", "story_id", "created_at_page", "supersedes", "axis", "participants", "direction", "value", "valence", "description", "derived_from"]
  },
  "story-location": {
    required: ["id", "story_id", "created_at_page", "label", "description"],
    properties: ["record_kind", "id", "story_id", "created_at_page", "supersedes", "label", "description", "bound_ent"]
  },
  "story-object": {
    required: ["id", "story_id", "created_at_page", "label", "description", "owner", "current_location"],
    properties: ["record_kind", "id", "story_id", "created_at_page", "supersedes", "label", "description", "owner", "current_location"]
  },
  "story-scene": {
    required: ["id", "story_id", "branch_id", "status", "pg_ids", "start_page_id", "end_page_id", "choice_surface_page_id", "emitted_choice_ids", "title", "slug", "prose_plan_path", "prose_path", "receipt_path"],
    properties: ["record_kind", "id", "story_id", "branch_id", "supersedes", "status", "pg_ids", "start_page_id", "end_page_id", "previous_scene_id", "choice_surface_page_id", "emitted_choice_ids", "title", "slug", "scene_descriptor", "boundary_rationale", "prose_plan_path", "prose_path", "receipt_path"]
  },
  "story-diegetic-artifact": {
    required: ["id", "story_id", "created_at_page", "title", "author", "genre", "body", "intended_audience", "circulation", "truth_relation"],
    properties: ["record_kind", "id", "story_id", "created_at_page", "supersedes", "title", "author", "genre", "body", "intended_audience", "circulation", "truth_relation", "derived_from"]
  },
  "story-branch": {
    required: ["id", "story_id", "created_at_page", "label", "parent_branch_id", "forked_at_page_id", "root_page_id"],
    properties: ["record_kind", "id", "story_id", "created_at_page", "label", "description", "parent_branch_id", "forked_at_page_id", "root_page_id"]
  },
  "story-choice": {
    required: ["id", "story_id", "created_at_page", "surface_label", "player_visible_intent", "target_or_action_families", "likely_state_pressure", "grounded_in"],
    properties: ["record_kind", "id", "story_id", "created_at_page", "supersedes", "surface_label", "player_visible_intent", "target_or_action_families", "likely_state_pressure", "grounded_in", "success_policy"]
  }
};

test("story schemas expose the amended contract field sets", () => {
  for (const [schemaName, expected] of Object.entries(EXPECTED_FIELD_SETS)) {
    const schema = readSchema(schemaName);
    assert.equal(schema.additionalProperties, false, schemaName);
    assert.deepEqual(schema.required, expected.required, schemaName);
    assert.deepEqual(Object.keys(schema.properties), expected.properties, schemaName);
  }

  const beliefSchema = readSchema("story-belief");
  const basis = beliefSchema.properties.basis as {
    required: string[];
    properties: Record<string, unknown>;
    additionalProperties: unknown;
  };
  assert.equal(basis.additionalProperties, false);
  assert.deepEqual(basis.required, ["source_event", "access_route"]);
  assert.deepEqual(Object.keys(basis.properties), ["source_event", "access_route", "access_records"]);
});

test("representative amended contract records validate against tightened schemas", async () => {
  const records = [
    storyRecord("story_entity_record", "STENT-1", "entities", {
      id: "STENT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      display_name: "Mara",
      bound_stchar_id: "STCHAR-1",
      role_in_story: ["primary_actor"]
    }),
    storyRecord("story_character_authority_record", "STCHAR-1", "story-characters", validStoryCharacterAuthority()),
    storyRecord("story_status_record", "STSTAT-1", "status", {
      id: "STSTAT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      entity: "STENT-1",
      life: "alive",
      agency: "free",
      location: "STLOC-1",
      derived_from: ["SE-1"]
    }),
    storyRecord("intention_record", "STINT-1", "intentions", {
      id: "STINT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      holder: "STENT-1",
      intent: "Repair the gate.",
      urgency: "medium",
      expires_when: "The gate is secured."
    }),
    storyRecord("story_fact_record", "SF-1", "facts", {
      id: "SF-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      statement: "The gate is damaged.",
      authority: "canon_linked",
      derived_from: ["CF-1"]
    }),
    storyRecord("obligation_record", "OBL-1", "obligations", {
      id: "OBL-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      status: "open",
      obligation_kind: "promise",
      description: "Mara promised to fix the gate.",
      owed_by: "STENT-1",
      owed_to: "public",
      trigger_to_close: "The gate is fixed.",
      urgency: "high"
    }),
    storyRecord("consequence_record", "CNSQ-1", "consequences", {
      id: "CNSQ-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      status: "pending",
      consequence_kind: "danger",
      description: "The broken gate leaves the alley exposed.",
      urgency: "high",
      resolves_when: "The gate is fixed.",
      derived_from: ["SE-1"]
    }),
    storyRecord("thread_record", "THR-1", "threads", {
      id: "THR-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      status: "active",
      title: "Gate repair",
      summary: "The damaged gate remains unresolved.",
      urgency: "medium",
      derived_from: ["OBL-1"]
    }),
    storyRecord("relationship_record_story", "SREL-1", "relationships", {
      id: "SREL-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      axis: "trust",
      participants: ["STENT-1", "STENT-2"],
      direction: {
        kind: "bidirectional",
        from: null,
        to: null
      },
      value: "trace",
      valence: "bidirectional",
      description: "They have a little trust."
    }),
    storyRecord("story_location_record", "STLOC-1", "locations", {
      id: "STLOC-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      label: "Salt gate",
      description: "A damaged gate near the alley.",
      bound_ent: null
    }),
    storyRecord("story_object_record", "STOBJ-1", "objects", {
      id: "STOBJ-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      label: "Broken latch",
      description: "A latch that can be repaired.",
      owner: "public",
      current_location: "STLOC-1"
    }),
    storyRecord("scene_record", "SCN-1", "scenes", {
      id: "SCN-1",
      story_id: "STORY-1",
      branch_id: "BR-1",
      supersedes: null,
      status: "planned",
      pg_ids: ["PG-1"],
      start_page_id: "PG-1",
      end_page_id: "PG-1",
      previous_scene_id: null,
      choice_surface_page_id: "PG-1",
      emitted_choice_ids: ["CHC-1"],
      title: "Gate repair scene",
      slug: "gate-repair-scene",
      scene_descriptor: "Mara studies the damaged gate.",
      boundary_rationale: "The POV, location, cast, and exchange stay continuous.",
      prose_plan_path: "scene-prose-plans/SCN-1.md",
      prose_path: "scene-prose/SCN-1.md",
      receipt_path: "scene-prose-receipts/SCN-1.yaml"
    }),
    storyRecord("story_diegetic_artifact_record", "DA-1", "artifacts", {
      id: "DA-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      title: "Gate Notice",
      author: "unknown",
      genre: "notice",
      body: "The gate is unsafe.",
      intended_audience: "public",
      circulation: "public",
      truth_relation: "true"
    }),
    storyRecord("story_event_record", "SE-1", "events", {
      id: "SE-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      parent_page_id: null,
      event_kind: "turn_resolution",
      actor: "STENT-1",
      turn_driver: {
        kind: "player_action",
        initiator: "player",
        driver_records: [],
        player_response_mode: "initiates",
        pov_visibility: "perceived_directly"
      },
      commitment: {
        selected_slt_id: "SLT-1",
        selection_source: "author_pool",
        alias_bindings: {
          actor: "STENT-1",
          debt: "OBL-1"
        }
      },
      outcome_route: "accept",
      world_logic_rationale: "The selected commitment block is available in the current branch state.",
      record_introductions: [
        {
          record_id: "CLK-1",
          class: "CLK",
          trigger: "deadline_declared",
          evidence: ["SE-1"],
          distinct_from: [],
          rationale: "The event starts a concrete deadline."
        }
      ],
      state_relations: [
        {
          relation: "advances",
          target_record: "STPLAN-1"
        }
      ],
      non_propagation_facts: [
        {
          reason: "event_leaves_no_accessible_trace",
          group: "direct_witnesses",
          records: ["DA-1"]
        }
      ],
      state_delta: {
        create: ["SF-1"],
        supersede: [],
        close: []
      }
    }),
    storyRecord("belief_record", "BEL-1", "beliefs", {
      id: "BEL-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      holder: "STENT-1",
      claim: "Mara knows the gate is damaged.",
      belief_mode: "knows",
      truth_relation: "true",
      confidence: "certain",
      visibility: "shared",
      basis: {
        source_event: "SE-1",
        access_route: "direct_observation",
        access_records: ["STENT-1", "SE-1"]
      },
      consequences: {
        opens: [],
        constrains_choices: []
      }
    }),
    storyRecord("branch_record", "BR-1", "branches", {
      id: "BR-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      label: "Root",
      parent_branch_id: null,
      forked_at_page_id: null,
      root_page_id: "PG-1"
    }),
    storyRecord("choice_record", "CHC-1", "choices", {
      id: "CHC-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      surface_label: "Fix the gate",
      player_visible_intent: "Repair the gate before anyone comes through.",
      target_or_action_families: ["make_change", "protect"],
      likely_state_pressure: "safety and obligation",
      grounded_in: {
        records: ["STENT-1", "STLOC-1"],
        affordance_ordinals: [0]
      }
    })
  ];

  const result = await recordSchemaCompliance.run({}, context(records));

  assert.deepEqual(result, []);
});

test("story-event schema rejects malformed SPEC-48 structured fields", async () => {
  const invalidRecords = [
    storyRecord("story_event_record", "SE-1", "events", {
      ...validEventRecord(),
      record_introductions: [
        {
          record_id: "CLK-1",
          class: "CLK",
          trigger: "tactical_approach_committed",
          evidence: ["SE-1"],
          distinct_from: []
        }
      ],
      state_relations: [
        {
          relation: "convolves",
          target_record: "STPLAN-1"
        }
      ],
      non_propagation_facts: [
        {
          reason: "event_leaves_no_accessible_trace",
          group: "direct_witnesses",
          records: ["not-a-record"]
        }
      ]
    })
  ];

  const result = await recordSchemaCompliance.run({}, context(invalidRecords));
  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.oneOf" &&
    verdict.message.includes("/record_introductions/0")
  ));
  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/state_relations/0/relation")
  ));
  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/non_propagation_facts/0/records/0")
  ));
});

test("story schemas accept padded legacy cross-references but keep malformed references invalid", async () => {
  const paddedReferenceRecords = [
    storyRecord("story_entity_record", "STENT-1", "entities", {
      id: "STENT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      display_name: "Mara",
      bound_stchar_id: "STCHAR-0005",
      role_in_story: ["primary_actor"]
    }),
    storyRecord("story_fact_record", "SF-1", "facts", {
      id: "SF-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      statement: "The gate was damaged.",
      authority: "canon_linked",
      derived_from: ["CF-0005", "STENT-0001"]
    }),
    storyRecord("story_status_record", "STSTAT-1", "status", {
      id: "STSTAT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      entity: "STENT-0001",
      life: "alive",
      agency: "free",
      location: "STLOC-0001",
      derived_from: ["SE-0001", "CF-0005"]
    }),
    storyRecord("story_event_record", "SE-1", "events", {
      id: "SE-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      parent_page_id: null,
      event_kind: "turn_resolution",
      actor: "STENT-0001",
      turn_driver: {
        kind: "player_action",
        initiator: "player",
        driver_records: [],
        player_response_mode: "initiates",
        pov_visibility: "perceived_directly"
      },
      targets: ["STLOC-0001", "STOBJ-0001"],
      commitment: {
        selected_slt_id: "SLT-1",
        selection_source: "author_pool",
        alias_bindings: {
          actor: "STENT-0001",
          debt: "OBL-0001"
        }
      },
      outcome_route: "accept",
      world_logic_rationale: "The branch state permits this event.",
      state_delta: {
        create: ["SF-0001"],
        supersede: ["BEL-0001"],
        close: ["THR-0001"]
      },
      promotion_claims: [
        {
          source_record: "STSTAT-0001",
          authority: "canon_candidate"
        }
      ]
    }),
    storyRecord("belief_record", "BEL-1", "beliefs", {
      id: "BEL-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      holder: "STENT-0001",
      claim: "Mara knows the gate is damaged.",
      belief_mode: "knows",
      truth_relation: "true",
      confidence: "certain",
      visibility: "shared",
      basis: {
        source_event: "SE-0001",
        access_route: "direct_observation",
        access_records: ["STENT-0001", "SE-0001"]
      },
      consequences: {
        opens: ["OBL-0001"],
        constrains_choices: ["CHC-0001"]
      }
    }),
    storyRecord("choice_record", "CHC-1", "choices", {
      id: "CHC-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      surface_label: "Fix the gate",
      player_visible_intent: "Repair the gate before anyone comes through.",
      target_or_action_families: ["make_change"],
      likely_state_pressure: "safety and obligation",
      grounded_in: {
        records: ["STENT-0001", "STLOC-0001"],
        affordance_ordinals: [0]
      }
    }),
    storyRecord("story_storylet_record", "SLT-1", "storylets", {
      id: "SLT-1",
      story_id: "STORY-1",
      scope: { visibility: "global_author_pool", branch_id: null },
      title: "Repair the gate",
      move_family: "make_change",
      preconditions: { hard: [{ pred: "record_active", record: "STENT-0001" }] },
      beats: [{ beat_id: "B1", function: "setup", instruction: "Mara examines the gate." }],
      effects: { create: ["SF-0001"], supersede: ["BEL-0001"], close: ["THR-0001"] },
      exit_options: [
        {
          action_family: "protect",
          surface_hint: "Secure the gate",
          likely_effects: ["CNSQ-0001"]
        }
      ],
      saliency: { urgency: "medium", cooldown_pages: 0 },
      mystery_policy: { allowed_authority: "apparent", forbidden_resolutions: ["M-0001"] },
      provenance: { origin: "bootstrap_seed" },
      grounding: {
        compatible_turn_drivers: ["player_action"],
        reason_to_exist: "Supports the repair-choice schema roundtrip fixture."
      }
    })
  ];

  const paddedResult = await recordSchemaCompliance.run({}, context(paddedReferenceRecords));
  assert.deepEqual(paddedResult, []);

  const malformedResult = await recordSchemaCompliance.run({}, context([
    storyRecord("story_entity_record", "STENT-1", "entities", {
      id: "STENT-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      display_name: "Mara",
      bound_stchar_id: "STCHAR-X",
      role_in_story: ["primary_actor"]
    }),
    storyRecord("story_fact_record", "SF-1", "facts", {
      id: "SF-1",
      story_id: "STORY-1",
      created_at_page: "PG-1",
      statement: "The gate was damaged.",
      authority: "canon_linked",
      derived_from: ["CF-"]
    })
  ]));

  assert.ok(malformedResult.some((verdict) =>
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/bound_stchar_id")
  ));
  assert.ok(malformedResult.some((verdict) =>
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/derived_from/0")
  ));
});

function readSchema(name: string): { required: string[]; properties: Record<string, unknown>; additionalProperties: unknown } {
  return JSON.parse(readFileSync(path.join(SCHEMA_ROOT, `${name}.schema.json`), "utf8"));
}

function validStoryCharacterAuthority(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "STCHAR-1",
    story_id: "STORY-1",
    story_slug: "test-story",
    world_slug: "test-world",
    source_kind: "world_char",
    source_char_id: "CHAR-1",
    source_char_sections_used: ["Voice", "Pressure Behavior"],
    regeneration_reason_class: null,
    story_local_inputs_used: [],
    generated_at_page: "story_bootstrap",
    created_by_skill: "story-character-profile",
    supersedes: null,
    superseded_by: null,
    status: "active",
    bound_stent_ids: ["STENT-1"],
    profile_revision: 1,
    body_schema_version: "stchar.v1",
    ...overrides
  };
}

function storyRecord(nodeType: string, id: string, dir: string, parsed: Record<string, unknown>) {
  return {
    ...record(nodeType, `test-story:${id}`, `stories/test-story/_source/${dir}/${id}.yaml`, parsed),
    story_slug: "test-story"
  };
}

function validEventRecord(): Record<string, unknown> {
  return {
    id: "SE-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    parent_page_id: null,
    event_kind: "turn_resolution",
    actor: "STENT-1",
    turn_driver: {
      kind: "player_action",
      initiator: "player",
      driver_records: [],
      player_response_mode: "initiates",
      pov_visibility: "perceived_directly"
    },
    commitment: {
      selected_slt_id: "SLT-1",
      selection_source: "author_pool",
      alias_bindings: {}
    },
    outcome_route: "accept",
    world_logic_rationale: "The selected commitment block is available in the current branch state.",
    state_delta: {
      create: [],
      supersede: [],
      close: []
    }
  };
}
