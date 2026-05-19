import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import Ajv2020Module from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";

type Ajv2020Instance = {
  compile(schema: unknown): ValidateFunction;
};
type Ajv2020Constructor = new (opts?: Record<string, unknown>) => Ajv2020Instance;
const Ajv2020 = Ajv2020Module as unknown as Ajv2020Constructor;

test("story-emotion schema accepts complete active STEMO records", () => {
  const validate = compileSchema();

  assert.equal(validate(validEmotion()), true, JSON.stringify(validate.errors, null, 2));
});

test("story-emotion schema accepts dissociated STEMO records with null affect", () => {
  const validate = compileSchema();

  assert.equal(validate(validEmotion({
    status: "dissociated",
    affect_kind: null,
    intensity: undefined,
    appraisal_basis: [],
    behavioral_pressure: []
  })), true, JSON.stringify(validate.errors, null, 2));
});

test("story-emotion schema rejects missing non-dissociated causal fields", () => {
  const validate = compileSchema();
  const parsed = validEmotion();
  delete parsed.behavioral_pressure;

  assert.equal(validate(parsed), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "required" && error.message?.includes("behavioral_pressure")));
});

test("story-emotion schema rejects invalid enum values and non-dissociated null affect", () => {
  const validate = compileSchema();

  assert.equal(validate(validEmotion({ affect_kind: "surprise" })), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "enum" && error.instancePath === "/affect_kind"));

  assert.equal(validate(validEmotion({ affect_kind: null })), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "type" && error.instancePath === "/affect_kind"));
});

test("story-emotion schema rejects unknown narrative-shape fields", () => {
  const validate = compileSchema();

  assert.equal(validate(validEmotion({ mood_arc: "rising" })), false);
  assert.ok(validate.errors?.some((error) =>
    error.keyword === "additionalProperties" &&
    String(error.message).includes("must NOT have additional properties")
  ));
});

function compileSchema(): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  return ajv.compile(readSchema("story-emotion"));
}

function readSchema(name: string): unknown {
  return JSON.parse(readFileSync(path.resolve(process.cwd(), "src", "schemas", `${name}.schema.json`), "utf8"));
}

function validEmotion(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const parsed: Record<string, unknown> = {
    id: "STEMO-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    created_by_event: "SE-1",
    supersedes: null,
    holder: "STENT-1",
    status: "active",
    affect_kind: "fear",
    intensity: "medium",
    orientation: {
      toward_records: ["STENT-2", "THR-1"]
    },
    appraisal_basis: ["BEL-1"],
    trigger_event: "SE-1",
    behavioral_pressure: ["freeze", "seek_help"],
    agency_effect: "constraining",
    expires_when: "The threat is resolved or the holder regains agency.",
    derived_from: ["SE-1"],
    ...overrides
  };

  for (const [key, value] of Object.entries(parsed)) {
    if (value === undefined) {
      delete parsed[key];
    }
  }
  return parsed;
}
