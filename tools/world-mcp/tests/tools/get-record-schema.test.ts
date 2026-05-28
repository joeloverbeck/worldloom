import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  getRecordSchema,
  SUPPORTED_RECORD_SCHEMA_NODE_TYPES,
  type SupportedRecordSchemaNodeType
} from "../../src/tools/get-record-schema.js";

const EXPECTED_SCHEMA_IDS: Record<SupportedRecordSchemaNodeType, string> = {
  canon_fact_record: "https://worldloom.local/schemas/canon-fact-record.schema.json",
  change_log_entry: "https://worldloom.local/schemas/change-log-entry.schema.json",
  invariant: "https://worldloom.local/schemas/invariant.schema.json",
  mystery_reserve_entry: "https://worldloom.local/schemas/mystery-reserve.schema.json",
  open_question_entry: "https://worldloom.local/schemas/open-question.schema.json",
  named_entity: "https://worldloom.local/schemas/entity.schema.json",
  section: "https://worldloom.local/schemas/section.schema.json",
  character_record: "https://worldloom.local/schemas/character-frontmatter.schema.json",
  character_proposal_card: "https://worldloom.local/schemas/character-proposal-card.schema.json",
  character_proposal_batch: "https://worldloom.local/schemas/character-proposal-batch.schema.json",
  diegetic_artifact_record: "https://worldloom.local/schemas/diegetic-artifact-frontmatter.schema.json",
  adjudication_record: "https://worldloom.local/schemas/adjudication-frontmatter.schema.json",
  extension_entry: "https://worldloom.local/schemas/extension-entry.schema.json",
  story_entity_record: "https://worldloom.local/schemas/story-entity.schema.json",
  story_status_record: "https://worldloom.local/schemas/story-status.schema.json",
  story_character_authority_record: "https://worldloom.local/schemas/story-character-authority.schema.json",
  story_plan_record: "https://worldloom.local/schemas/story-plan.schema.json",
  story_emotion_record: "https://worldloom.local/schemas/story-emotion.schema.json",
  scene_record: "https://worldloom.local/schemas/story-scene.schema.json",
  story_fact_record: "https://worldloom.local/schemas/story-fact.schema.json",
  story_event_record: "https://worldloom.local/schemas/story-event.schema.json",
  obligation_record: "https://worldloom.local/schemas/story-obligation.schema.json",
  consequence_record: "https://worldloom.local/schemas/story-consequence.schema.json",
  thread_record: "https://worldloom.local/schemas/story-thread.schema.json",
  relationship_record_story: "https://worldloom.local/schemas/story-relationship.schema.json",
  intention_record: "https://worldloom.local/schemas/story-intention.schema.json",
  story_location_record: "https://worldloom.local/schemas/story-location.schema.json",
  story_object_record: "https://worldloom.local/schemas/story-object.schema.json",
  pressure_clock_record: "https://worldloom.local/schemas/story-pressure-clock.schema.json",
  story_secret_record: "https://worldloom.local/schemas/story-secret.schema.json",
  story_question_record: "https://worldloom.local/schemas/story-question.schema.json",
  branch_record: "https://worldloom.local/schemas/story-branch.schema.json",
  page_record: "https://worldloom.local/schemas/story-page.schema.json",
  choice_record: "https://worldloom.local/schemas/story-choice.schema.json",
  storylet_record: "https://worldloom.local/schemas/story-storylet.schema.json",
  belief_record: "https://worldloom.local/schemas/story-belief.schema.json",
  story_diegetic_artifact_record: "https://worldloom.local/schemas/story-diegetic-artifact.schema.json"
};

const EXPECTED_SOURCE_PATHS: Record<SupportedRecordSchemaNodeType, string> = {
  canon_fact_record: "tools/validators/src/schemas/canon-fact-record.schema.json",
  change_log_entry: "tools/validators/src/schemas/change-log-entry.schema.json",
  invariant: "tools/validators/src/schemas/invariant.schema.json",
  mystery_reserve_entry: "tools/validators/src/schemas/mystery-reserve.schema.json",
  open_question_entry: "tools/validators/src/schemas/open-question.schema.json",
  named_entity: "tools/validators/src/schemas/entity.schema.json",
  section: "tools/validators/src/schemas/section.schema.json",
  character_record: "tools/validators/src/schemas/character-frontmatter.schema.json",
  character_proposal_card: "tools/validators/src/schemas/character-proposal-card.schema.json",
  character_proposal_batch: "tools/validators/src/schemas/character-proposal-batch.schema.json",
  diegetic_artifact_record: "tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json",
  adjudication_record: "tools/validators/src/schemas/adjudication-frontmatter.schema.json",
  extension_entry: "tools/validators/src/schemas/_shared/extension-entry.schema.json",
  story_entity_record: "tools/validators/src/schemas/story-entity.schema.json",
  story_status_record: "tools/validators/src/schemas/story-status.schema.json",
  story_character_authority_record: "tools/validators/src/schemas/story-character-authority.schema.json",
  story_plan_record: "tools/validators/src/schemas/story-plan.schema.json",
  story_emotion_record: "tools/validators/src/schemas/story-emotion.schema.json",
  scene_record: "tools/validators/src/schemas/story-scene.schema.json",
  story_fact_record: "tools/validators/src/schemas/story-fact.schema.json",
  story_event_record: "tools/validators/src/schemas/story-event.schema.json",
  obligation_record: "tools/validators/src/schemas/story-obligation.schema.json",
  consequence_record: "tools/validators/src/schemas/story-consequence.schema.json",
  thread_record: "tools/validators/src/schemas/story-thread.schema.json",
  relationship_record_story: "tools/validators/src/schemas/story-relationship.schema.json",
  intention_record: "tools/validators/src/schemas/story-intention.schema.json",
  story_location_record: "tools/validators/src/schemas/story-location.schema.json",
  story_object_record: "tools/validators/src/schemas/story-object.schema.json",
  pressure_clock_record: "tools/validators/src/schemas/story-pressure-clock.schema.json",
  story_secret_record: "tools/validators/src/schemas/story-secret.schema.json",
  story_question_record: "tools/validators/src/schemas/story-question.schema.json",
  branch_record: "tools/validators/src/schemas/story-branch.schema.json",
  page_record: "tools/validators/src/schemas/story-page.schema.json",
  choice_record: "tools/validators/src/schemas/story-choice.schema.json",
  storylet_record: "tools/validators/src/schemas/story-storylet.schema.json",
  belief_record: "tools/validators/src/schemas/story-belief.schema.json",
  story_diegetic_artifact_record: "tools/validators/src/schemas/story-diegetic-artifact.schema.json"
};

const EXTENSION_ENTRY_ID = "https://worldloom.local/schemas/extension-entry.schema.json";

function readSourceSchema(nodeType: SupportedRecordSchemaNodeType): Record<string, unknown> {
  const absolutePath = path.resolve(process.cwd(), "..", "..", EXPECTED_SOURCE_PATHS[nodeType]);
  return JSON.parse(readFileSync(absolutePath, "utf8")) as Record<string, unknown>;
}

test("getRecordSchema returns the expected schema for every supported node type", async () => {
  for (const nodeType of SUPPORTED_RECORD_SCHEMA_NODE_TYPES) {
    const result = await getRecordSchema({ node_type: nodeType });

    assert.ok(!("code" in result));
    assert.equal(result.node_type, nodeType);
    assert.equal(result.schema.$id, EXPECTED_SCHEMA_IDS[nodeType]);
    assert.equal(result.source_path, EXPECTED_SOURCE_PATHS[nodeType]);
    assert.deepEqual(result.schema, readSourceSchema(nodeType));
    assert.deepEqual(result.required_fields, readSourceSchema(nodeType).required ?? []);
  }
});

test("getRecordSchema returns referenced schemas keyed by schema id URL", async () => {
  const canonFact = await getRecordSchema({ node_type: "canon_fact_record" });
  const section = await getRecordSchema({ node_type: "section" });

  assert.ok(!("code" in canonFact));
  assert.ok(!("code" in section));
  assert.equal(canonFact.referenced_schemas[EXTENSION_ENTRY_ID]?.$id, EXTENSION_ENTRY_ID);
  assert.equal(section.referenced_schemas[EXTENSION_ENTRY_ID]?.$id, EXTENSION_ENTRY_ID);
});

test("getRecordSchema keeps the primary schema ref intact while exposing referenced schemas", async () => {
  const result = await getRecordSchema({ node_type: "canon_fact_record" });

  assert.ok(!("code" in result));
  const properties = result.schema.properties as Record<string, unknown>;
  const preFiguredBy = properties.pre_figured_by as { items: { pattern: string } };
  const extensions = properties.extensions as { items: { $ref: string } };

  assert.equal(preFiguredBy.items.pattern, "^CF-[0-9]+$");
  assert.equal(extensions.items.$ref, EXTENSION_ENTRY_ID);
  assert.equal(result.referenced_schemas[EXTENSION_ENTRY_ID]?.$id, EXTENSION_ENTRY_ID);
});

test("getRecordSchema exposes validator-sourced canon safety conditional blocks", async () => {
  const result = await getRecordSchema({ node_type: "canon_fact_record" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.conditional_blocks, {
    epistemic_profile: {
      required_for_types: [
        "capability",
        "bloodline",
        "magic_practice",
        "technology",
        "divine_action",
        "artifact_dependent_truth",
        "exception_introducing_fact",
        "institution_with_secrecy",
        "knowledge_asymmetric_fact"
      ]
    },
    exception_governance: {
      required_for_types: [
        "capability",
        "bloodline",
        "magic_practice",
        "technology",
        "divine_action",
        "artifact_dependent_truth",
        "exception_introducing_fact"
      ]
    }
  });
});

test("getRecordSchema returns shared extension entry schema as a first-class node type", async () => {
  const result = await getRecordSchema({ node_type: "extension_entry" });

  assert.ok(!("code" in result));
  assert.equal(result.schema.$id, EXTENSION_ENTRY_ID);
  assert.equal(result.source_path, "tools/validators/src/schemas/_shared/extension-entry.schema.json");
  assert.deepEqual(result.referenced_schemas, {});
  assert.deepEqual(result.required_fields, ["originating_cf", "change_id", "date", "label", "body"]);
  assert.deepEqual(result.conditional_blocks, {});
});

test("getRecordSchema exposes character proposal schemas", async () => {
  const proposalCard = await getRecordSchema({ node_type: "character_proposal_card" });
  const proposalBatch = await getRecordSchema({ node_type: "character_proposal_batch" });

  assert.ok(!("code" in proposalCard));
  assert.ok(!("code" in proposalBatch));
  assert.equal(
    proposalCard.schema.$id,
    "https://worldloom.local/schemas/character-proposal-card.schema.json"
  );
  assert.equal(
    proposalBatch.schema.$id,
    "https://worldloom.local/schemas/character-proposal-batch.schema.json"
  );
  assert.equal(
    proposalCard.source_path,
    "tools/validators/src/schemas/character-proposal-card.schema.json"
  );
  assert.equal(
    proposalBatch.source_path,
    "tools/validators/src/schemas/character-proposal-batch.schema.json"
  );
  assert.deepEqual(proposalCard.required_fields, readSourceSchema("character_proposal_card").required);
  assert.deepEqual(proposalBatch.required_fields, readSourceSchema("character_proposal_batch").required);
});

test("getRecordSchema returns story-bundle schemas from validator sources", async () => {
  const storylet = await getRecordSchema({ node_type: "storylet_record" });
  const storyFact = await getRecordSchema({ node_type: "story_fact_record" });
  const page = await getRecordSchema({ node_type: "page_record" });
  const belief = await getRecordSchema({ node_type: "belief_record" });
  const clock = await getRecordSchema({ node_type: "pressure_clock_record" });
  const secret = await getRecordSchema({ node_type: "story_secret_record" });
  const question = await getRecordSchema({ node_type: "story_question_record" });
  const branch = await getRecordSchema({ node_type: "branch_record" });
  const status = await getRecordSchema({ node_type: "story_status_record" });
  const plan = await getRecordSchema({ node_type: "story_plan_record" });
  const emotion = await getRecordSchema({ node_type: "story_emotion_record" });

  assert.ok(!("code" in storylet));
  assert.ok(!("code" in storyFact));
  assert.ok(!("code" in page));
  assert.ok(!("code" in belief));
  assert.ok(!("code" in clock));
  assert.ok(!("code" in secret));
  assert.ok(!("code" in question));
  assert.ok(!("code" in branch));
  assert.ok(!("code" in status));
  assert.ok(!("code" in plan));
  assert.ok(!("code" in emotion));

  assert.equal(storylet.schema.additionalProperties, false);
  const storyletProperties = storylet.schema.properties as Record<
    string,
    { enum?: string[]; pattern?: string; properties?: Record<string, unknown> }
  >;
  assert.equal(storyletProperties.id?.pattern, "^SLT-(0|[1-9][0-9]*)$");
  assert.ok(storyletProperties.move_family?.enum?.includes("investigation"));
  assert.ok(storyletProperties.exit_options);
  assert.equal(storylet.source_path, "tools/validators/src/schemas/story-storylet.schema.json");
  assert.deepEqual(storylet.required_fields, readSourceSchema("storylet_record").required);
  assert.ok(storylet.required_fields.includes("move_family"));
  assert.deepEqual(storylet.conditional_blocks, {});

  assert.equal(storyFact.schema.$id, "https://worldloom.local/schemas/story-fact.schema.json");
  assert.equal(page.schema.$id, "https://worldloom.local/schemas/story-page.schema.json");
  assert.equal(belief.schema.$id, "https://worldloom.local/schemas/story-belief.schema.json");
  assert.equal(belief.source_path, "tools/validators/src/schemas/story-belief.schema.json");
  assert.deepEqual(belief.required_fields, [
    "id",
    "story_id",
    "created_at_page",
    "holder",
    "claim",
    "belief_mode",
    "truth_relation",
    "confidence",
    "visibility",
    "basis",
    "consequences"
  ]);
  assert.equal(branch.schema.$id, "https://worldloom.local/schemas/story-branch.schema.json");
  assert.equal(clock.schema.$id, "https://worldloom.local/schemas/story-pressure-clock.schema.json");
  assert.equal(secret.schema.$id, "https://worldloom.local/schemas/story-secret.schema.json");
  assert.equal(question.schema.$id, "https://worldloom.local/schemas/story-question.schema.json");
  assert.equal(clock.source_path, "tools/validators/src/schemas/story-pressure-clock.schema.json");
  assert.equal(secret.source_path, "tools/validators/src/schemas/story-secret.schema.json");
  assert.equal(question.source_path, "tools/validators/src/schemas/story-question.schema.json");
  assert.ok(clock.required_fields.includes("clock_kind"));
  assert.ok((secret.schema.properties as Record<string, unknown>).clue_carriers);
  assert.ok(question.required_fields.includes("question_or_setup"));
  assert.equal(status.schema.$id, "https://worldloom.local/schemas/story-status.schema.json");
  assert.deepEqual(status.required_fields, [
    "id",
    "story_id",
    "created_at_page",
    "entity",
    "life",
    "agency",
    "location"
  ]);
  assert.equal(plan.schema.$id, "https://worldloom.local/schemas/story-plan.schema.json");
  assert.equal(emotion.schema.$id, "https://worldloom.local/schemas/story-emotion.schema.json");
  assert.equal(plan.source_path, "tools/validators/src/schemas/story-plan.schema.json");
  assert.equal(emotion.source_path, "tools/validators/src/schemas/story-emotion.schema.json");
  assert.ok(plan.required_fields.includes("plan_status"));
  assert.ok(emotion.required_fields.includes("status"));
  assert.ok("affect_kind" in (emotion.schema.properties as Record<string, unknown>));
});

test("getRecordSchema exposes post-reset choice carrier fields", async () => {
  const choice = await getRecordSchema({ node_type: "choice_record" });

  assert.ok(!("code" in choice));
  const properties = choice.schema.properties as Record<string, unknown>;
  assert.deepEqual(choice.required_fields, [
    "id",
    "story_id",
    "created_at_page",
    "surface_label",
    "player_visible_intent",
    "target_or_action_families",
    "likely_state_pressure",
    "grounded_in"
  ]);
  assert.ok(properties.surface_label);
  assert.ok(properties.player_visible_intent);
  assert.ok(properties.target_or_action_families);
  assert.ok(properties.likely_state_pressure);
  assert.ok(properties.success_policy);
});

test("getRecordSchema returns an empty referenced schema map when the schema has no refs", async () => {
  const result = await getRecordSchema({ node_type: "adjudication_record" });

  assert.ok(!("code" in result));
  assert.deepEqual(result.referenced_schemas, {});
});

test("getRecordSchema rejects unsupported node types", async () => {
  const result = await getRecordSchema({ node_type: "foo" as never });

  assert.ok("code" in result);
  assert.equal(result.code, "invalid_input");
  assert.deepEqual(result.details?.supported_node_types, [...SUPPORTED_RECORD_SCHEMA_NODE_TYPES]);
});
