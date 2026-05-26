import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/events/SE-1.yaml";
const VALID_EVENT_KINDS = [
  "story_start",
  "turn_resolution",
  "system_repair",
  "audit_repair",
  "prose_attach",
  "promotion_closeout"
];
const NEW_SREL_AXIS_TRIGGERS = [
  "fear_axis_becomes_relevant",
  "desire_axis_becomes_relevant",
  "loyalty_axis_becomes_relevant",
  "resentment_axis_becomes_relevant",
  "power_imbalance_axis_becomes_relevant",
  "attention_axis_becomes_relevant",
  "familiarity_axis_becomes_relevant",
  "approval_axis_becomes_relevant",
  "respect_axis_becomes_relevant",
  "obligation_axis_becomes_relevant"
] as const;

test("record_schema_compliance accepts every contract SE event_kind value", async () => {
  for (const eventKind of VALID_EVENT_KINDS) {
    const parsed = validEvent({
      event_kind: eventKind,
      commitment: commitmentForEventKind(eventKind)
    });
    if (eventKind !== "turn_resolution") {
      delete parsed.turn_driver;
    }

    const result = await recordSchemaCompliance.run({}, context([
      eventRecord(parsed)
    ]));

    assert.deepEqual(result, [], eventKind);
  }
});

test("record_schema_compliance rejects retired SE event_kind values", async () => {
  for (const eventKind of ["selected_choice", "write_in_attempt", "world_block", "repair"]) {
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

test("record_schema_compliance accepts turn-resolution SE commitment bindings", async () => {
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

test("record_schema_compliance rejects structural and STCHAR alias binding payloads", async () => {
  for (const [alias, id] of Object.entries({
    character: "STCHAR-1",
    event: "SE-1",
    page: "PG-1",
    branch: "BR-1",
    choice: "CHC-1",
    storylet: "SLT-1"
  })) {
    const result = await recordSchemaCompliance.run({}, context([
      eventRecord(validEvent({
        commitment: {
          selected_slt_id: "SLT-7",
          selection_source: "author_pool",
          alias_bindings: {
            [alias]: id
          }
        }
      }))
    ]));

    assert.ok(result.some((verdict) =>
      verdict.code === "record_schema_compliance.pattern" &&
      verdict.message.includes(`/commitment/alias_bindings/${alias}`)
    ), id);
  }
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
        create: ["STCHAR-1", "STSTAT-1", "CLK-1", "STSEC-1", "STQ-1", "STPLAN-1", "STEMO-1"],
        supersede: ["STCHAR-2", "STSTAT-2", "CLK-2", "STSEC-2", "STQ-2", "STPLAN-2", "STEMO-2"],
        close: ["STCHAR-3", "STSTAT-3", "CLK-3", "STSEC-3", "STQ-3", "STPLAN-3", "STEMO-3"]
      }
    }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects structural records in state_delta arrays", async () => {
  for (const [key, id] of [
    ["create", "PG-1"],
    ["create", "SE-2"],
    ["supersede", "BR-1"],
    ["supersede", "CHC-3"],
    ["close", "SLT-1"]
  ] as const) {
    const stateDelta: { create: string[]; supersede: string[]; close: string[] } = {
      create: [],
      supersede: [],
      close: []
    };
    stateDelta[key] = [id];

    const result = await recordSchemaCompliance.run({}, context([
      eventRecord(validEvent({ state_delta: stateDelta }))
    ]));

    assert.ok(result.some((verdict) =>
      verdict.code === "record_schema_compliance.pattern" &&
      verdict.message.includes(`/state_delta/${key}/0`)
    ), `${key}:${id}`);
  }
});

test("record_schema_compliance accepts STCHAR record introductions", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    eventRecord(validEvent({
      record_introductions: [
        {
          record_id: "STCHAR-1",
          class: "STCHAR",
          trigger: "story_character_authority_distilled",
          evidence: ["SE-1"],
          distinct_from: []
        }
      ]
    }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts new SREL axis-relevance record introduction triggers", async () => {
  for (const trigger of NEW_SREL_AXIS_TRIGGERS) {
    const result = await recordSchemaCompliance.run({}, context([
      eventRecord(validEvent({
        record_introductions: [
          {
            record_id: "SREL-1",
            class: "SREL",
            trigger,
            evidence: ["SE-1"],
            distinct_from: []
          }
        ]
      }))
    ]));

    assert.deepEqual(result, [], trigger);
  }
});

test("record_schema_compliance rejects STCHAR promotion claim source records", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    eventRecord(validEvent({
      promotion_claims: [
        {
          source_record: "STCHAR-1",
          authority: "canon_candidate"
        }
      ]
    }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/promotion_claims/0/source_record")
  ));
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
    event_kind: "turn_resolution",
    created_at_page: "PG-1",
    parent_page_id: null,
    actor: "STENT-1",
    turn_driver: {
      kind: "player_action",
      initiator: "player",
      driver_records: [],
      player_response_mode: "initiates",
      pov_visibility: "perceived_directly"
    },
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
  if (["story_start", "system_repair", "audit_repair", "prose_attach", "promotion_closeout"].includes(eventKind)) {
    return {
      selected_slt_id: null,
      selection_source: "none",
      alias_bindings: {}
    };
  }

  return {
    selected_slt_id: "SLT-1",
    selection_source: "emitted_choice",
    alias_bindings: {
      actor: "STENT-1"
    }
  };
}
