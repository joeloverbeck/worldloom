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

test("storylet schema accepts well-formed grounding", () => {
  const validate = compileSchema();

  assert.equal(validate(validStorylet()), true, JSON.stringify(validate.errors, null, 2));
});

test("storylet schema requires grounding", () => {
  const validate = compileSchema();
  const { grounding: _grounding, ...record } = validStorylet();

  assert.equal(validate(record), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "required" && error.message?.includes("grounding")));
});

test("storylet schema rejects empty compatible_turn_drivers", () => {
  const validate = compileSchema();
  const record = validStorylet({
    grounding: {
      ...validGrounding(),
      compatible_turn_drivers: []
    }
  });

  assert.equal(validate(record), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "minItems" && error.instancePath === "/grounding/compatible_turn_drivers"));
});

test("storylet schema rejects unknown compatible_turn_drivers value", () => {
  const validate = compileSchema();
  const record = validStorylet({
    grounding: {
      ...validGrounding(),
      compatible_turn_drivers: ["bogus_kind"]
    }
  });

  assert.equal(validate(record), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "enum" && error.instancePath === "/grounding/compatible_turn_drivers/0"));
});

test("storylet schema rejects short reason_to_exist", () => {
  const validate = compileSchema();
  const record = validStorylet({
    grounding: {
      ...validGrounding(),
      reason_to_exist: "short"
    }
  });

  assert.equal(validate(record), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "minLength" && error.instancePath === "/grounding/reason_to_exist"));
});

test("storylet schema rejects additional grounding properties", () => {
  const validate = compileSchema();
  const record = validStorylet({
    grounding: {
      ...validGrounding(),
      causal_pressures: ["plan_pressure"]
    }
  });

  assert.equal(validate(record), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "additionalProperties" && error.instancePath === "/grounding"));
});

function compileSchema(): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  return ajv.compile(readSchema());
}

function readSchema(): unknown {
  return JSON.parse(readFileSync(path.resolve(process.cwd(), "src", "schemas", "story-storylet.schema.json"), "utf8"));
}

function validStorylet(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "SLT-1",
    story_id: "STORY-1",
    scope: {
      visibility: "global_author_pool",
      branch_id: null
    },
    created_at_page: null,
    title: "Offstage pursuit pressure",
    move_family: "pursuit",
    preconditions: {
      hard: [{ pred: "record_active", record: "STPLAN-1" }],
      soft: []
    },
    beats: [
      {
        beat_id: "B1",
        function: "pressure",
        instruction: "Bring the active pursuit pressure into view."
      }
    ],
    exit_options: [
      {
        action_family: "evade",
        surface_hint: "Find cover before the pursuer closes distance.",
        likely_effects: ["THR-1"]
      }
    ],
    saliency: {
      urgency: "high",
      cooldown_pages: 0
    },
    mystery_policy: {
      forbidden_resolutions: [],
      allowed_authority: "apparent"
    },
    provenance: {
      origin: "manual_authoring"
    },
    grounding: validGrounding(),
    ...overrides
  };
}

function validGrounding(): Record<string, unknown> {
  return {
    compatible_turn_drivers: ["npc_action", "offstage_action"],
    reason_to_exist: "Covers offstage pursuit pressure from an active opposing actor."
  };
}
