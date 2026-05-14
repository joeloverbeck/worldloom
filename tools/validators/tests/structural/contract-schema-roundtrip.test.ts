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
    properties: ["id", "story_id", "created_at_page", "supersedes", "holder", "claim", "belief_mode", "truth_relation", "confidence", "visibility", "basis", "consequences"]
  },
  "story-page": {
    required: ["id", "story_id", "branch_id", "parent_page_id", "branch_path", "turn_index", "input", "state_hash_parent", "state_hash", "state_snapshot", "plan", "prose_plan_path", "emitted_choices", "validation_trace"],
    properties: ["id", "story_id", "branch_id", "parent_page_id", "branch_path", "turn_index", "input", "state_hash_parent", "state_hash", "state_snapshot", "plan", "prose_plan_path", "prose_path", "prose_receipt_path", "emitted_choices", "validation_trace"]
  },
  "story-event": {
    required: ["id", "story_id", "created_at_page", "parent_page_id", "event_kind", "actor", "outcome_route", "world_logic_rationale", "state_delta"],
    properties: ["id", "story_id", "created_at_page", "parent_page_id", "event_kind", "actor", "targets", "outcome_route", "resolution", "world_logic_rationale", "state_delta", "promotion_claims"]
  },
  "story-storylet": {
    required: ["id", "story_id", "scope", "title", "move_family", "preconditions", "beats", "exit_options", "saliency", "mystery_policy", "provenance"],
    properties: ["id", "story_id", "supersedes", "scope", "created_at_page", "title", "move_family", "preconditions", "beats", "effects", "exit_options", "saliency", "mystery_policy", "provenance"]
  },
  "story-entity": {
    required: ["id", "story_id", "created_at_page", "display_name", "role_in_story"],
    properties: ["id", "story_id", "created_at_page", "supersedes", "display_name", "bound_char_id", "role_in_story"]
  },
  "story-status": {
    required: ["id", "story_id", "created_at_page", "entity", "life", "agency", "location"],
    properties: ["id", "story_id", "created_at_page", "supersedes", "entity", "life", "agency", "location", "derived_from"]
  },
  "story-intention": {
    required: ["id", "story_id", "created_at_page", "holder", "intent", "urgency", "expires_when"],
    properties: ["id", "story_id", "created_at_page", "supersedes", "holder", "intent", "urgency", "expires_when"]
  },
  "story-fact": {
    required: ["id", "story_id", "created_at_page", "statement", "authority"],
    properties: ["id", "story_id", "created_at_page", "supersedes", "statement", "authority", "derived_from"]
  },
  "story-obligation": {
    required: ["id", "story_id", "created_at_page", "status", "obligation_kind", "description", "owed_by", "owed_to", "trigger_to_close", "urgency"],
    properties: ["id", "story_id", "created_at_page", "supersedes", "status", "obligation_kind", "description", "owed_by", "owed_to", "trigger_to_close", "urgency"]
  },
  "story-consequence": {
    required: ["id", "story_id", "created_at_page", "status", "consequence_kind", "description", "resolves_when", "urgency"],
    properties: ["id", "story_id", "created_at_page", "supersedes", "status", "consequence_kind", "description", "urgency", "resolves_when", "derived_from"]
  },
  "story-thread": {
    required: ["id", "story_id", "created_at_page", "status", "title", "summary", "urgency"],
    properties: ["id", "story_id", "created_at_page", "supersedes", "status", "title", "summary", "urgency", "derived_from"]
  },
  "story-relationship": {
    required: ["id", "story_id", "created_at_page", "axis", "participants", "direction", "value", "valence", "description"],
    properties: ["id", "story_id", "created_at_page", "supersedes", "axis", "participants", "direction", "value", "valence", "description", "derived_from"]
  },
  "story-location": {
    required: ["id", "story_id", "created_at_page", "label", "description"],
    properties: ["id", "story_id", "created_at_page", "supersedes", "label", "description", "bound_ent"]
  },
  "story-object": {
    required: ["id", "story_id", "created_at_page", "label", "description", "owner", "current_location"],
    properties: ["id", "story_id", "created_at_page", "supersedes", "label", "description", "owner", "current_location"]
  },
  "story-diegetic-artifact": {
    required: ["id", "story_id", "created_at_page", "title", "author", "genre", "body", "intended_audience", "circulation", "truth_relation"],
    properties: ["id", "story_id", "created_at_page", "supersedes", "title", "author", "genre", "body", "intended_audience", "circulation", "truth_relation", "derived_from"]
  },
  "story-branch": {
    required: ["id", "story_id", "created_at_page", "label", "parent_branch_id", "forked_at_page_id", "root_page_id"],
    properties: ["id", "story_id", "created_at_page", "label", "description", "parent_branch_id", "forked_at_page_id", "root_page_id"]
  },
  "story-choice": {
    required: ["id", "story_id", "created_at_page", "surface_label", "player_visible_intent", "target_or_action_families", "likely_state_pressure", "associated_commitment_block", "grounded_in"],
    properties: ["id", "story_id", "created_at_page", "supersedes", "surface_label", "player_visible_intent", "target_or_action_families", "likely_state_pressure", "associated_commitment_block", "grounded_in", "success_policy"]
  }
};

test("story schemas expose the amended contract field sets", () => {
  for (const [schemaName, expected] of Object.entries(EXPECTED_FIELD_SETS)) {
    const schema = readSchema(schemaName);
    assert.equal(schema.additionalProperties, false, schemaName);
    assert.deepEqual(schema.required, expected.required, schemaName);
    assert.deepEqual(Object.keys(schema.properties), expected.properties, schemaName);
  }
});

test("representative amended contract records validate against tightened schemas", async () => {
  const records = [
    storyRecord("story_entity_record", "STENT-0001", "entities", {
      id: "STENT-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001",
      display_name: "Mara",
      role_in_story: ["primary_actor"]
    }),
    storyRecord("story_status_record", "STSTAT-0001", "status", {
      id: "STSTAT-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001",
      entity: "STENT-0001",
      life: "alive",
      agency: "free",
      location: "STLOC-0001",
      derived_from: ["SE-0001"]
    }),
    storyRecord("intention_record", "STINT-0001", "intentions", {
      id: "STINT-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001",
      holder: "STENT-0001",
      intent: "Repair the gate.",
      urgency: "medium",
      expires_when: "The gate is secured."
    }),
    storyRecord("story_fact_record", "SF-0001", "facts", {
      id: "SF-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001",
      statement: "The gate is damaged.",
      authority: "canon_linked",
      derived_from: ["CF-0001"]
    }),
    storyRecord("obligation_record", "OBL-0001", "obligations", {
      id: "OBL-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001",
      status: "open",
      obligation_kind: "promise",
      description: "Mara promised to fix the gate.",
      owed_by: "STENT-0001",
      owed_to: "public",
      trigger_to_close: "The gate is fixed.",
      urgency: "high"
    }),
    storyRecord("consequence_record", "CNSQ-0001", "consequences", {
      id: "CNSQ-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001",
      status: "pending",
      consequence_kind: "danger",
      description: "The broken gate leaves the alley exposed.",
      urgency: "high",
      resolves_when: "The gate is fixed.",
      derived_from: ["SE-0001"]
    }),
    storyRecord("thread_record", "THR-0001", "threads", {
      id: "THR-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001",
      status: "active",
      title: "Gate repair",
      summary: "The damaged gate remains unresolved.",
      urgency: "medium",
      derived_from: ["OBL-0001"]
    }),
    storyRecord("relationship_record_story", "SREL-0001", "relationships", {
      id: "SREL-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001",
      axis: "trust",
      participants: ["STENT-0001", "STENT-0002"],
      direction: "bidirectional",
      value: "trace",
      valence: "bidirectional",
      description: "They have a little trust."
    }),
    storyRecord("story_location_record", "STLOC-0001", "locations", {
      id: "STLOC-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001",
      label: "Salt gate",
      description: "A damaged gate near the alley.",
      bound_ent: null
    }),
    storyRecord("story_object_record", "STOBJ-0001", "objects", {
      id: "STOBJ-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001",
      label: "Broken latch",
      description: "A latch that can be repaired.",
      owner: "public",
      current_location: "STLOC-0001"
    }),
    storyRecord("story_diegetic_artifact_record", "DA-0001", "artifacts", {
      id: "DA-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001",
      title: "Gate Notice",
      author: "unknown",
      genre: "notice",
      body: "The gate is unsafe.",
      intended_audience: "public",
      circulation: "public",
      truth_relation: "true"
    }),
    storyRecord("branch_record", "BR-0001", "branches", {
      id: "BR-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001",
      label: "Root",
      parent_branch_id: null,
      forked_at_page_id: null,
      root_page_id: "PG-0001"
    }),
    storyRecord("choice_record", "CHC-0001", "choices", {
      id: "CHC-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001",
      surface_label: "Fix the gate",
      player_visible_intent: "Repair the gate before anyone comes through.",
      target_or_action_families: ["make_change", "protect"],
      likely_state_pressure: "safety and obligation",
      associated_commitment_block: null,
      grounded_in: {
        records: ["STENT-0001", "STLOC-0001"],
        affordance_ordinals: [0]
      }
    })
  ];

  const result = await recordSchemaCompliance.run({}, context(records));

  assert.deepEqual(result, []);
});

function readSchema(name: string): { required: string[]; properties: Record<string, unknown>; additionalProperties: unknown } {
  return JSON.parse(readFileSync(path.join(SCHEMA_ROOT, `${name}.schema.json`), "utf8"));
}

function storyRecord(nodeType: string, id: string, dir: string, parsed: Record<string, unknown>) {
  return {
    ...record(nodeType, `test-story:${id}`, `stories/test-story/_source/${dir}/${id}.yaml`, parsed),
    story_slug: "test-story"
  };
}
