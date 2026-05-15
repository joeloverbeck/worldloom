import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const PAGE_FILE_PATH = "stories/foo/_source/pages/PG-0001.yaml";

function pageRecord(parsed: Record<string, unknown>) {
  return record("page_record", String(parsed.id ?? "PG-0001"), PAGE_FILE_PATH, parsed);
}

function validPagePayload(): Record<string, unknown> {
  return {
    id: "PG-0001",
    story_id: "STORY-001",
    branch_id: "BR-0001",
    parent_page_id: null,
    branch_path: ["PG-0001"],
    turn_index: 0,
    input: {
      choice_id: null,
      manual_action_text: null,
      resolved_event_id: "SE-0001"
    },
    state_hash_parent: null,
    prose_plan_path: "pages-prose-plans/PG-0001.md",
    plan: {
      plan_hash: "0000000000000000000000000000000000000000000000000000000000000001"
    },
    state_hash: "0000000000000000000000000000000000000000000000000000000000000002",
    state_snapshot: {
      canon_revision: "CH-0001",
      entity_status: {
        "STENT-0001": {
          life: "alive",
          agency: "free",
          location: "STLOC-0001"
        },
        "STENT-0002": {
          life: "unknown",
          agency: "unknown",
          location: "concealed"
        }
      },
      unresolved_mystery_claims: [
        {
          mystery_id: "M-0001",
          authority: "apparent",
          status: "clue_added",
          evidence_records: ["SF-0001"]
        }
      ],
      visible_affordances: [
        {
          ordinal: 0,
          label: "door to the alley",
          grounded_in: ["STLOC-0001", "STOBJ-0001"],
          available_to: ["STENT-0001"],
          action_families: ["move", "evade"]
        }
      ]
    },
    emitted_choices: [],
    validation_trace: {
      input_legality: "PASS: checked"
    }
  };
}

test("record_schema_compliance accepts a PG record with contract-shaped snapshot blocks", async () => {
  const result = await recordSchemaCompliance.run({}, context([pageRecord(validPagePayload())]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects a PG record with retired prose_path", async () => {
  const parsed = validPagePayload();
  parsed.prose_path = "pages-prose/PG-0001.md";

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.additionalProperties" &&
    verdict.message.includes("must NOT have additional properties")
  )));
});

test("record_schema_compliance rejects a PG record with retired prose_receipt_path", async () => {
  const parsed = validPagePayload();
  parsed.prose_receipt_path = "pages-prose-receipts/PG-0001.yaml";

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.additionalProperties" &&
    verdict.message.includes("must NOT have additional properties")
  )));
});

test("record_schema_compliance rejects PG records missing prose_plan_path", async () => {
  const parsed = validPagePayload();
  delete parsed.prose_plan_path;

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("must have required property 'prose_plan_path'")
  )));
});

test("record_schema_compliance rejects PG records missing plan", async () => {
  const parsed = validPagePayload();
  delete parsed.plan;

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("must have required property 'plan'")
  )));
});

test("record_schema_compliance rejects PG records missing state_hash", async () => {
  const parsed = validPagePayload();
  delete parsed.state_hash;

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("must have required property 'state_hash'")
  )));
});

test("record_schema_compliance does not require retired prose-status fields", async () => {
  const parsed = validPagePayload();

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects PG records with invalid entity life enum values", async () => {
  const parsed = validPagePayload();
  const stateSnapshot = parsed.state_snapshot as Record<string, unknown>;
  const entityStatus = stateSnapshot.entity_status as Record<string, unknown>;
  const mara = entityStatus["STENT-0001"] as Record<string, unknown>;
  mara.life = "missing";

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/state_snapshot/entity_status/STENT-0001/life")
  )));
});

test("record_schema_compliance rejects PG records with a prose_plan_path that violates the pattern", async () => {
  const parsed = validPagePayload();
  parsed.prose_plan_path = "pages-prose/PG-0001.md";

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/prose_plan_path")
  )));
});

test("record_schema_compliance rejects PG records with placeholder plan_hash", async () => {
  const parsed = validPagePayload();
  const plan = parsed.plan as Record<string, unknown>;
  plan.plan_hash = "PLACEHOLDER_TO_BE_COMPUTED";

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/plan/plan_hash")
  )));
});

test("record_schema_compliance rejects PG records with placeholder state_hash", async () => {
  const parsed = validPagePayload();
  parsed.state_hash = "PLACEHOLDER_TO_BE_COMPUTED_BY_ENGINE";

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/state_hash")
  )));
});

test("record_schema_compliance rejects PG records with invalid mystery claim status values", async () => {
  const parsed = validPagePayload();
  const stateSnapshot = parsed.state_snapshot as Record<string, unknown>;
  const claims = stateSnapshot.unresolved_mystery_claims as Record<string, unknown>[];
  claims[0]!.status = "advanced";

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/state_snapshot/unresolved_mystery_claims/0/status")
  )));
});

test("record_schema_compliance accepts mystery claim evidence_records", async () => {
  const parsed = validPagePayload();

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects malformed mystery claim evidence_records", async () => {
  const parsed = validPagePayload();
  const stateSnapshot = parsed.state_snapshot as Record<string, unknown>;
  const claims = stateSnapshot.unresolved_mystery_claims as Record<string, unknown>[];
  claims[0]!.evidence_records = ["STENT-0001"];

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/state_snapshot/unresolved_mystery_claims/0/evidence_records/0")
  )));
});

test("record_schema_compliance rejects PG records with invalid canon revision values", async () => {
  const parsed = validPagePayload();
  const stateSnapshot = parsed.state_snapshot as Record<string, unknown>;
  stateSnapshot.canon_revision = "CF-0001";

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/state_snapshot/canon_revision")
  )));
});

test("record_schema_compliance rejects PG records with invalid affordance action families", async () => {
  const parsed = validPagePayload();
  const stateSnapshot = parsed.state_snapshot as Record<string, unknown>;
  const affordances = stateSnapshot.visible_affordances as Record<string, unknown>[];
  affordances[0]!.action_families = ["hide"];

  const result = await recordSchemaCompliance.run({}, context([pageRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/state_snapshot/visible_affordances/0/action_families/0")
  )));
});
