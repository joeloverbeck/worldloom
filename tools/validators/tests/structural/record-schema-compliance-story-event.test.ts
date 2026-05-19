import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/events/SE-1.yaml";
const VALID_EVENT_KINDS = [
  "story_start",
  "selected_choice",
  "write_in_attempt",
  "system_repair",
  "audit_repair",
  "prose_attach",
  "promotion_closeout"
];

test("record_schema_compliance accepts every contract SE event_kind value", async () => {
  for (const eventKind of VALID_EVENT_KINDS) {
    const result = await recordSchemaCompliance.run({}, context([
      eventRecord(validEvent({
        event_kind: eventKind,
        commitment: commitmentForEventKind(eventKind)
      }))
    ]));

    assert.deepEqual(result, [], eventKind);
  }
});

test("record_schema_compliance rejects retired SE event_kind values", async () => {
  for (const eventKind of ["world_block", "repair"]) {
    const result = await recordSchemaCompliance.run({}, context([
      eventRecord(validEvent({ event_kind: eventKind }))
    ]));

    assert.ok(result.some((verdict) =>
      verdict.code === "record_schema_compliance.enum" &&
      verdict.message.includes("/event_kind")
    ), eventKind);
  }
});

test("record_schema_compliance requires SE event_kind", async () => {
  const parsed = validEvent();
  delete parsed.event_kind;

  const result = await recordSchemaCompliance.run({}, context([
    eventRecord(parsed)
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("'event_kind'")
  ));
});

test("record_schema_compliance requires SE commitment", async () => {
  const parsed = validEvent();
  delete parsed.commitment;

  const result = await recordSchemaCompliance.run({}, context([
    eventRecord(parsed)
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("'commitment'")
  ));
});

test("record_schema_compliance accepts selected-choice SE commitment bindings", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    eventRecord(validEvent({
      commitment: {
        selected_slt_id: "SLT-7",
        selection_source: "author_pool",
        alias_bindings: {
          debt: "OBL-1",
          witness: "STENT-2"
        }
      }
    }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts existential predicate class alias bindings", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    eventRecord(validEvent({
      commitment: {
        selected_slt_id: "SLT-7",
        selection_source: "author_pool",
        alias_bindings: {
          active_clock: "CLK-1",
          hidden_secret: "STSEC-1",
          open_setup: "STQ-1",
          active_plan: "STPLAN-1",
          active_emotion: "STEMO-1"
        }
      }
    }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects alias bindings outside the story-event binding set", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    eventRecord(validEvent({
      commitment: {
        selected_slt_id: "SLT-7",
        selection_source: "author_pool",
        alias_bindings: {
          mystery: "M-1"
        }
      }
    }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/commitment/alias_bindings/mystery")
  ));
});

test("record_schema_compliance rejects none source with selected SLT", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    eventRecord(validEvent({
      event_kind: "story_start",
      commitment: {
        selected_slt_id: "SLT-1",
        selection_source: "none",
        alias_bindings: {}
      }
    }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.type" &&
    verdict.message.includes("/commitment/selected_slt_id")
  ));
});

test("record_schema_compliance accepts attempt SE resolution", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    eventRecord(validEvent({
      outcome_route: "attempt",
      resolution: {
        result: "partial_success",
        player_visible_feedback: "The player can tell the lock yielded only halfway."
      }
    }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance requires resolution on non-accept routes that need it", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    eventRecord(validEvent({ outcome_route: "attempt" }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("'resolution'")
  ));
});

test("record_schema_compliance rejects route-inconsistent resolution results", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    eventRecord(validEvent({
      outcome_route: "world_block",
      resolution: {
        result: "success",
        player_visible_feedback: "The player can tell the door opens despite being sealed."
      }
    }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/resolution/result")
  ));
});

test("record_schema_compliance accepts accept route with resolution absent", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    eventRecord(validEvent({ outcome_route: "accept" }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts conformant SE resolution shape for every route", async () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["accept", {}],
    ["attempt", resolution("success")],
    ["accommodate", resolution("transformed")],
    ["world_block", resolution("impossible")],
    ["promotion_hold", resolution("held_for_promotion")],
    ["terminal", resolution("failure")]
  ];

  for (const [outcomeRoute, routeResolution] of cases) {
    const result = await recordSchemaCompliance.run({}, context([
      eventRecord(validEvent({
        outcome_route: outcomeRoute,
        ...routeResolution
      }))
    ]));

    assert.deepEqual(result, [], outcomeRoute);
  }
});

test("record_schema_compliance accepts STSTAT and SREL promotion claim source records", async () => {
  for (const sourceRecord of ["STSTAT-3", "SREL-2"]) {
    const result = await recordSchemaCompliance.run({}, context([
      eventRecord(validEvent({
        promotion_claims: [
          {
            source_record: sourceRecord,
            authority: "canon_candidate"
          }
        ]
      }))
    ]));

    assert.deepEqual(result, [], sourceRecord);
  }
});

test("record_schema_compliance accepts state_delta references to every SPEC-44 story-state class", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    eventRecord(validEvent({
      state_delta: {
        create: ["STSTAT-1", "CLK-1", "STSEC-1", "STQ-1", "STPLAN-1", "STEMO-1"],
        supersede: ["STSTAT-2", "CLK-2", "STSEC-2", "STQ-2", "STPLAN-2", "STEMO-2"],
        close: ["STSTAT-3", "CLK-3", "STSEC-3", "STQ-3", "STPLAN-3", "STEMO-3"]
      }
    }))
  ]));

  assert.deepEqual(result, []);
});

function eventRecord(parsed: Record<string, unknown>) {
  return {
    ...record("story_event_record", "test-story:SE-1", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "SE-1",
    story_id: "STORY-1",
    event_kind: "selected_choice",
    created_at_page: "PG-1",
    parent_page_id: null,
    actor: "STENT-1",
    commitment: {
      selected_slt_id: "SLT-1",
      selection_source: "emitted_choice",
      alias_bindings: {
        actor: "STENT-1"
      }
    },
    outcome_route: "accept",
    world_logic_rationale: "The branch state permits this event.",
    state_delta: {
      create: [],
      supersede: [],
      close: []
    },
    ...overrides
  };
}

function resolution(result: string): Record<string, unknown> {
  return {
    resolution: {
      result,
      player_visible_feedback: "The player can tell how the route resolved."
    }
  };
}

function commitmentForEventKind(eventKind: string): Record<string, unknown> {
  if (["story_start", "prose_attach", "promotion_closeout"].includes(eventKind)) {
    return {
      selected_slt_id: null,
      selection_source: "none",
      alias_bindings: {}
    };
  }

  return {
    selected_slt_id: "SLT-1",
    selection_source: eventKind === "system_repair"
      ? "system_repair"
      : eventKind === "audit_repair"
        ? "audit_repair"
        : eventKind === "write_in_attempt"
          ? "runtime_jit"
          : "emitted_choice",
    alias_bindings: {
      actor: "STENT-1"
    }
  };
}
