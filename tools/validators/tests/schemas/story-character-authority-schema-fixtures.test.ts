import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import Ajv2020Module from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";

import { OPERATIONAL_TARGET_SECTIONS } from "../../src/structural/_stchar-operational-sections.js";

type Ajv2020Instance = {
  compile(schema: unknown): ValidateFunction;
};
type Ajv2020Constructor = new (opts?: Record<string, unknown>) => Ajv2020Instance;
const Ajv2020 = Ajv2020Module as unknown as Ajv2020Constructor;

test("story-character-authority schema rejects retained non-operational target sections", () => {
  const validate = compileSchema();

  assert.equal(validate(validStchar({
    source_operational_fact_map: [
      {
        source_field: "cannot_be_swapped_out_because",
        disposition: "transformed",
        target_section: "Validation / Audit Anchors"
      }
    ]
  })), false);
  assert.ok(validate.errors?.some((error) =>
    error.keyword === "enum" &&
    error.instancePath === "/source_operational_fact_map/0/target_section"
  ));
});

test("story-character-authority schema accepts retained operational target sections", () => {
  const validate = compileSchema();

  assert.equal(validate(validStchar({
    source_operational_fact_map: [
      {
        source_field: "cannot_be_swapped_out_because",
        disposition: "transformed",
        target_section: "Stable Persona Core"
      }
    ]
  })), true, JSON.stringify(validate.errors, null, 2));
});

test("story-character-authority schema accepts omitted source facts without target sections", () => {
  const validate = compileSchema();

  assert.equal(validate(validStchar({
    source_operational_fact_map: [
      {
        source_field: "cannot_be_swapped_out_because",
        disposition: "story_irrelevant",
        rationale: "non_operational_trivia"
      }
    ]
  })), true, JSON.stringify(validate.errors, null, 2));
});

test("story-character-authority target_section enum matches the runtime operational sections", () => {
  const schemaSections = new Set(readRetainedTargetSectionEnum());

  assert.deepEqual(schemaSections, OPERATIONAL_TARGET_SECTIONS);
});

function compileSchema(): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  return ajv.compile(readSchema());
}

function readSchema(): Record<string, unknown> {
  return JSON.parse(readFileSync(path.resolve(process.cwd(), "src", "schemas", "story-character-authority.schema.json"), "utf8"));
}

function readRetainedTargetSectionEnum(): string[] {
  const schema = readSchema();
  const sourceFactMap = property(schema, "source_operational_fact_map");
  const items = objectValue(sourceFactMap.items);
  const conditionals = arrayValue(items.allOf);
  const retainedConditional = objectValue(conditionals[0]);
  const thenSchema = objectValue(retainedConditional.then);
  const thenProperties = objectValue(thenSchema.properties);
  const targetSection = objectValue(thenProperties.target_section);
  return stringArray(targetSection.enum);
}

function property(schema: Record<string, unknown>, name: string): Record<string, unknown> {
  const properties = objectValue(schema.properties);
  return objectValue(properties[name]);
}

function objectValue(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

function arrayValue(value: unknown): unknown[] {
  assert.equal(Array.isArray(value), true);
  return value as unknown[];
}

function stringArray(value: unknown): string[] {
  const array = arrayValue(value);
  assert.ok(array.every((item) => typeof item === "string"));
  return array as string[];
}

function validStchar(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "STCHAR-1",
    story_id: "STORY-1",
    story_slug: "red-bunny",
    world_slug: "animalia",
    source_kind: "world_char",
    source_char_id: "CHAR-1",
    source_char_sections_used: ["dramatic_core"],
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
