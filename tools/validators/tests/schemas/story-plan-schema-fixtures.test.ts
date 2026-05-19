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

test("story-plan schema accepts complete STPLAN records", () => {
  const validate = compileSchema();

  assert.equal(validate(validPlan()), true, JSON.stringify(validate.errors, null, 2));
});

test("story-plan schema requires current_step for active-lifecycle plans", () => {
  const validate = compileSchema();
  const parsed = validPlan();
  delete parsed.current_step;

  assert.equal(validate(parsed), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "required" && error.message?.includes("current_step")));
});

test("story-plan schema allows terminal plans without current_step", () => {
  const validate = compileSchema();
  const parsed = validPlan({ plan_status: "fulfilled", belief_basis: [] });
  delete parsed.current_step;

  assert.equal(validate(parsed), true, JSON.stringify(validate.errors, null, 2));
});

test("story-plan schema requires non-empty belief_basis for active-lifecycle plans", () => {
  const validate = compileSchema();

  assert.equal(validate(validPlan({ belief_basis: [] })), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "minItems" && error.instancePath === "/belief_basis"));
});

test("story-plan schema allows terminal plans with empty belief_basis", () => {
  const validate = compileSchema();

  assert.equal(validate(validPlan({ plan_status: "failed", belief_basis: [] })), true, JSON.stringify(validate.errors, null, 2));
});

test("story-plan schema rejects invalid enum and ID shapes", () => {
  const validate = compileSchema();

  assert.equal(validate(validPlan({ plan_status: "climax_ready" })), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "enum" && error.instancePath === "/plan_status"));

  assert.equal(validate(validPlan({ root_intention: "STPLAN-1" })), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "pattern" && error.instancePath === "/root_intention"));
});

test("story-plan schema rejects unknown narrative-shape fields", () => {
  const validate = compileSchema();

  assert.equal(validate(validPlan({ risk_posture: "bold" })), false);
  assert.ok(validate.errors?.some((error) =>
    error.keyword === "additionalProperties" &&
    String(error.message).includes("must NOT have additional properties")
  ));
});

function compileSchema(): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  return ajv.compile(readSchema("story-plan"));
}

function readSchema(name: string): unknown {
  return JSON.parse(readFileSync(path.resolve(process.cwd(), "src", "schemas", `${name}.schema.json`), "utf8"));
}

function validPlan(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "STPLAN-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    created_by_event: "SE-1",
    supersedes: null,
    holder: "STENT-1",
    root_intention: "STINT-1",
    objective: "Get the ledger out of the locked room.",
    plan_status: "active",
    belief_basis: ["BEL-1"],
    resource_basis: {
      facts: ["SF-1"],
      objects: ["STOBJ-1"],
      locations: ["STLOC-1"],
      artifacts: ["DA-1"],
      relationships: ["SREL-1"],
      obligations: ["OBL-1"]
    },
    blockers: ["THR-1"],
    current_step: {
      action_family: "investigate",
      target_records: ["STLOC-1"],
      success_condition: {
        predicates: [{ pred: "record_active", record: "SF-1" }]
      }
    },
    fallback_steps: [
      {
        action_family: "negotiate",
        trigger_predicates: [{ pred: "obligation_open", obligation: "OBL-1" }],
        target_records: ["STENT-2"]
      }
    ],
    expires_when: "The ledger is recovered or the holder abandons the search.",
    derived_from: ["SE-1"],
    ...overrides
  };
}
