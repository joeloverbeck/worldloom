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

test("story-event schema requires turn_driver on turn_resolution", () => {
  const validate = compileSchema();

  assert.equal(validate(validEvent({ turn_driver: undefined })), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "required" && error.message?.includes("turn_driver")));
});

test("story-event schema forbids turn_driver on story_start", () => {
  const validate = compileSchema();

  assert.equal(validate(validStoryStart({ turn_driver: playerDriver() })), false);
  assert.ok(validate.errors?.some((error) => error.instancePath === "/turn_driver"));
});

test("story-event schema rejects player_action with driver records", () => {
  const validate = compileSchema();

  assert.equal(validate(validEvent({
    turn_driver: playerDriver({ driver_records: ["STPLAN-1"] })
  })), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "maxItems" && error.instancePath === "/turn_driver/driver_records"));
});

test("story-event schema rejects directly perceived offstage actions", () => {
  const validate = compileSchema();

  assert.equal(validate(validEvent({
    turn_driver: {
      kind: "offstage_action",
      initiator: "STENT-2",
      driver_records: ["STPLAN-1"],
      player_response_mode: "responds",
      pov_visibility: "perceived_directly"
    }
  })), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "enum" && error.instancePath === "/turn_driver/pov_visibility"));
});

test("story-event schema rejects npc_action initiated by the player", () => {
  const validate = compileSchema();

  assert.equal(validate(validEvent({
    turn_driver: {
      kind: "npc_action",
      initiator: "player",
      driver_records: ["STPLAN-1"],
      player_response_mode: "responds",
      pov_visibility: "perceived_directly"
    }
  })), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "pattern" && error.instancePath === "/turn_driver/initiator"));
});

test("story-event schema accepts representative turn-driver kinds", () => {
  const validate = compileSchema();
  const cases: Record<string, Record<string, unknown>> = {
    player_action: playerDriver(),
    player_write_in: playerDriver({ kind: "player_write_in" }),
    npc_action: {
      kind: "npc_action",
      initiator: "STENT-2",
      driver_records: ["STPLAN-1", "STCHAR-1"],
      player_response_mode: "responds",
      pov_visibility: "perceived_directly"
    },
    offstage_action: {
      kind: "offstage_action",
      initiator: "STENT-2",
      driver_records: ["STPLAN-1"],
      player_response_mode: "witnesses",
      pov_visibility: "reported"
    },
    world_pressure: {
      kind: "world_pressure",
      initiator: "world",
      driver_records: ["THR-1"],
      player_response_mode: "responds",
      pov_visibility: "inferred_from_trace"
    },
    clock_fire: {
      kind: "clock_fire",
      initiator: "world",
      driver_records: ["CLK-1"],
      player_response_mode: "responds",
      pov_visibility: "perceived_directly"
    },
    secret_reveal: {
      kind: "secret_reveal",
      initiator: "world",
      driver_records: ["STSEC-1"],
      player_response_mode: "witnesses",
      pov_visibility: "discovered_after"
    },
    multi_actor_collision: {
      kind: "multi_actor_collision",
      initiator: "unknown",
      driver_records: ["STPLAN-1", "STEMO-1"],
      player_response_mode: "responds",
      pov_visibility: "perceived_directly"
    }
  };

  for (const [kind, turnDriver] of Object.entries(cases)) {
    assert.equal(validate(validEvent({ turn_driver: turnDriver })), true, `${kind}: ${JSON.stringify(validate.errors, null, 2)}`);
  }
});

test("story-event schema accepts STINT and BEL driver records while preserving npc_action pressure root", () => {
  const validate = compileSchema();

  assert.equal(validate(validEvent({
    turn_driver: {
      kind: "npc_action",
      initiator: "STENT-2",
      driver_records: ["STINT-10", "BEL-16"],
      player_response_mode: "responds",
      pov_visibility: "perceived_directly"
    }
  })), true, JSON.stringify(validate.errors, null, 2));

  assert.equal(validate(validEvent({
    turn_driver: {
      kind: "npc_action",
      initiator: "STENT-2",
      driver_records: ["STINT-10", "STEMO-15", "STQ-5", "THR-7", "BEL-16", "STCHAR-1"],
      player_response_mode: "responds",
      pov_visibility: "perceived_directly"
    }
  })), true, JSON.stringify(validate.errors, null, 2));

  assert.equal(validate(validEvent({
    turn_driver: {
      kind: "npc_action",
      initiator: "STENT-2",
      driver_records: ["BEL-16"],
      player_response_mode: "responds",
      pov_visibility: "perceived_directly"
    }
  })), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "contains" && error.instancePath === "/turn_driver/driver_records"));
});

test("story-event schema rejects retired selected choice event kinds", () => {
  const validate = compileSchema();

  for (const eventKind of ["selected_choice", "write_in_attempt"]) {
    assert.equal(validate(validEvent({ event_kind: eventKind })), false, eventKind);
    assert.ok(validate.errors?.some((error) => error.keyword === "enum" && error.instancePath === "/event_kind"), eventKind);
  }
});

function compileSchema(): ValidateFunction {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  return ajv.compile(readSchema());
}

function readSchema(): unknown {
  return JSON.parse(readFileSync(path.resolve(process.cwd(), "src", "schemas", "story-event.schema.json"), "utf8"));
}

function validEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const event = {
    id: "SE-1",
    story_id: "STORY-1",
    created_at_page: "PG-2",
    parent_page_id: "PG-1",
    event_kind: "turn_resolution",
    actor: "STENT-1",
    turn_driver: playerDriver(),
    commitment: {
      selected_slt_id: "SLT-1",
      selection_source: "emitted_choice",
      alias_bindings: {
        actor: "STENT-1"
      }
    },
    outcome_route: "accept",
    world_logic_rationale: "The branch state permits this driver now.",
    state_delta: {
      create: [],
      supersede: [],
      close: []
    },
    ...overrides
  };

  for (const [key, value] of Object.entries(event)) {
    if (value === undefined) {
      delete (event as Record<string, unknown>)[key];
    }
  }

  return event;
}

function validStoryStart(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return validEvent({
    created_at_page: "PG-1",
    parent_page_id: null,
    event_kind: "story_start",
    turn_driver: undefined,
    commitment: {
      selected_slt_id: null,
      selection_source: "none",
      alias_bindings: {}
    },
    ...overrides
  });
}

function playerDriver(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: "player_action",
    initiator: "player",
    driver_records: [],
    player_response_mode: "initiates",
    pov_visibility: "perceived_directly",
    ...overrides
  };
}
