import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import Ajv2020Module from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";

import { PRED_TYPES, PREDICATE_ARG_SCHEMAS } from "../src/rules/_shared/predicate-dsl-grammar.js";

type Ajv2020Instance = {
  compile(schema: unknown): ValidateFunction;
  errorsText(errors?: ErrorObject[] | null): string;
};
type Ajv2020Constructor = new (opts?: Record<string, unknown>) => Ajv2020Instance;
const Ajv2020 = Ajv2020Module as unknown as Ajv2020Constructor;

type PredicateSchema = {
  $id: string;
  oneOf: Array<{
    title: string;
    required: string[];
    properties: Record<string, unknown>;
  }>;
};

function readPredicateSchema(): PredicateSchema {
  return JSON.parse(
    readFileSync(path.resolve(process.cwd(), "src/schemas/predicate-dsl-grammar.schema.json"), "utf8")
  ) as PredicateSchema;
}

function sampleFor(pred: (typeof PRED_TYPES)[number]): Record<string, unknown> {
  switch (pred) {
    case "fact_true":
      return { pred, fact: "SF-1" };
    case "belief_record":
      return { pred, holder: "STENT-1", belief_id: "BEL-1" };
    case "entity_status":
      return { pred, entity: "STENT-1", field: "life", value: "alive" };
    case "relationship_axis":
      return { pred, from: "STENT-1", to: "STENT-2", axis: "trust", value: 1 };
    case "obligation_open":
      return { pred, obligation: "OBL-1" };
    case "consequence_pending":
      return { pred, consequence: "CNSQ-1" };
    case "thread_active":
      return { pred, thread: "THR-1" };
    case "clock_at_least":
    case "clock_below":
      return { pred, clock: "CLK-1", value: 2 };
    case "clock_full":
      return { pred, clock: "CLK-1" };
    case "secret_unrevealed":
    case "secret_revealed":
    case "revelation_ready":
      return { pred, secret: "STSEC-1" };
    case "any_obligation_open":
    case "any_consequence_pending":
    case "any_thread_active":
    case "any_clock_active":
    case "any_secret_unrevealed":
    case "any_belief":
    case "any_intention":
      return { pred, alias: "matched_record" };
    case "any_relationship_axis":
      return { pred, alias: "matched_record", axis: "trust", comparator: ">=", value: 1 };
    case "location":
      return { pred, entity: "STENT-1", location: "STLOC-1" };
    case "has_affordance":
      return { pred, action_family: "move" };
    case "record_active":
      return { pred, record: "SF-1" };
    case "record_age":
      return { pred, record: "SF-1", comparator: ">=", pages: 1 };
    case "intention_active":
      return { pred, intention: "STINT-1" };
    case "object_accessible":
      return { pred, entity: "STENT-1", object: "STOBJ-1" };
    case "artifact_accessible":
      return { pred, entity: "STENT-1", artifact: "DA-1" };
    case "affordance_available_to":
      return { pred, entity: "STENT-1", action_family: "move" };
    case "not":
      return { pred, predicate: { pred: "record_active", record: "SF-1" } };
    case "all":
    case "any":
      return { pred, predicates: [{ pred: "record_active", record: "SF-1" }] };
  }
}

test("predicate DSL schema mirrors predicate names and required argument table", () => {
  const schema = readPredicateSchema();
  const schemasByTitle = new Map(schema.oneOf.map((entry) => [entry.title, entry]));

  assert.equal(schema.$id, "https://worldloom.local/schemas/predicate-dsl-grammar.schema.json");
  assert.deepEqual(schema.oneOf.map((entry) => entry.title), [...PRED_TYPES]);

  for (const pred of PRED_TYPES) {
    const entry = schemasByTitle.get(pred);
    assert.ok(entry, `missing schema entry for ${pred}`);
    assert.deepEqual(entry.required, ["pred", ...PREDICATE_ARG_SCHEMAS[pred].required]);
    assert.deepEqual(entry.properties.pred, { const: pred });
  }
});

test("predicate DSL schema accepts valid samples and rejects missing required args", () => {
  const schema = readPredicateSchema();
  const ajv = new Ajv2020({ strict: true });
  const validate = ajv.compile(schema);

  for (const pred of PRED_TYPES) {
    const validSample = sampleFor(pred);
    assert.equal(validate(validSample), true, `${pred} valid sample should pass: ${ajv.errorsText(validate.errors)}`);

    const requiredArg = PREDICATE_ARG_SCHEMAS[pred].required[0];
    const invalidSample = { ...validSample };
    delete invalidSample[requiredArg];
    assert.equal(validate(invalidSample), false, `${pred} missing ${requiredArg} should fail`);
  }
});

test("predicate DSL schema exposes runtime-derived ID patterns for representative predicates", () => {
  const schema = readPredicateSchema();
  const ajv = new Ajv2020({ strict: true });
  const validate = ajv.compile(schema);

  assert.equal(validate({ pred: "obligation_open", obligation: "CNSQ-1" }), false);
  assert.equal(validate({ pred: "consequence_pending", consequence: "OBL-1" }), false);
  assert.equal(validate({ pred: "location", entity: "STENT-1", location: "STENT-2" }), false);
  assert.equal(validate({ pred: "intention_active", intention: "STENT-1" }), false);
});
