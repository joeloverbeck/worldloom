import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/story-characters/STCHAR-1.md";
const HASH = "sha256:0000000000000000000000000000000000000000000000000000000000000001";

test("record_schema_compliance accepts complete STCHAR frontmatter", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    stcharRecord(validStchar())
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts optional STCHAR source operational fact map", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    stcharRecord(validStchar({
      source_operational_fact_map: [
        {
          source_field: "world_produced_wound",
          disposition: "copied",
          target_section: "Pressure Behavior"
        },
        {
          source_field: "active_appetite",
          disposition: "transformed",
          target_section: "Agency and Planning Tendencies"
        },
        {
          source_field: "self_mythology",
          disposition: "compressed",
          target_section: "Story-Facing Identity"
        },
        {
          source_field: "irreconcilable_contradiction",
          disposition: "omitted_with_rationale",
          rationale: "Not relevant to this local story role."
        },
        {
          source_field: "signature_scene_behaviors",
          disposition: "story_irrelevant",
          rationale: "The character is referenced only in a factual index entry."
        }
      ]
    }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts STCHAR frontmatter without source operational fact map", async () => {
  const parsed = validStchar();
  delete parsed.source_operational_fact_map;

  const result = await recordSchemaCompliance.run({}, context([
    stcharRecord(parsed)
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts story-local STCHAR with null source operational fact map", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    stcharRecord(validStchar({
      source_kind: "story_local",
      source_char_id: null,
      source_operational_fact_map: null
    }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects unknown STCHAR source operational fact disposition", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    stcharRecord(validStchar({
      source_operational_fact_map: [
        {
          source_field: "signature_scene_behaviors",
          disposition: "left_in_source_distillation",
          target_section: "Prose Rendering Constraints"
        }
      ]
    }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/source_operational_fact_map/0/disposition")
  ));
});

test("record_schema_compliance rejects reintroduced STCHAR hashes", async () => {
  const parsed = validStchar();
  parsed.profile_hash = HASH;

  const result = await recordSchemaCompliance.run({}, context([
    stcharRecord(parsed)
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.additionalProperties" &&
    verdict.message.includes("must NOT have additional properties")
  ));
});

test("record_schema_compliance rejects malformed STCHAR ids", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    stcharRecord(validStchar({ id: "STCHAR-X" }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/id")
  ));
});

test("record_schema_compliance requires world-char STCHAR provenance", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    stcharRecord(validStchar({ source_char_id: null }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.message.includes("/source_char_id")
  ));
});

test("record_schema_compliance rejects story-local STCHAR with world CHAR provenance", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    stcharRecord(validStchar({ source_kind: "story_local", source_char_id: "CHAR-1" }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.type" &&
    verdict.message.includes("/source_char_id")
  ));
});

function stcharRecord(parsed: Record<string, unknown>) {
  return {
    ...record("story_character_authority_record", "test-story:STCHAR-1", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validStchar(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "STCHAR-1",
    story_id: "STORY-1",
    story_slug: "test-story",
    world_slug: "test-world",
    source_kind: "world_char",
    source_char_id: "CHAR-1",
    source_char_sections_used: ["Voice", "Pressure Behavior"],
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
