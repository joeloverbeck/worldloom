import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";

import { effectModelReplaySafety } from "../../src/rules/effect_model_replay_safety.js";
import { context, record } from "../structural/helpers.js";

test("effect_model_replay_safety accepts a page whose variant is derivable from SE ops", async () => {
  const result = await effectModelReplaySafety.run({}, context(validReplayRecords()));

  assert.deepEqual(result, []);
});

test("effect_model_replay_safety rejects a missing applied variant id", async () => {
  const records = validReplayRecords();
  records[1] = pageRecord("PG-0002", "missing-variant", ["SE-0002"]);

  const result = await effectModelReplaySafety.run({}, context(records));

  assert.ok(result.some((verdict) => verdict.code === "effect_model_replay_safety.unknown_variant"));
});

test("effect_model_replay_safety rejects required effects not derived by SE ops", async () => {
  const records = validReplayRecords();
  records[2] = eventRecord("SE-0002", ["fact_create"]);

  const result = await effectModelReplaySafety.run({}, context(records));

  assert.ok(result.some((verdict) => verdict.code === "effect_model_replay_safety.missing_derived_event_op"));
});

test("effect_model_replay_safety accepts PG-0001 root-page null variant exception", async () => {
  const result = await effectModelReplaySafety.run({}, context([
    pageRecord("PG-0001", null, [])
  ]));

  assert.deepEqual(result, []);
});

test("effect_model_replay_safety requires non-root pages to name a variant", async () => {
  const result = await effectModelReplaySafety.run({}, context([
    pageRecord("PG-0002", null, [])
  ]));

  assert.ok(result.some((verdict) => verdict.code === "effect_model_replay_safety.missing_applied_effect_variant"));
});

function validReplayRecords() {
  return [
    storyletRecord(completeStorylet()),
    pageRecord("PG-0002", "partial-repair", ["SE-0002"]),
    eventRecord("SE-0002", ["relationship_supersede"])
  ];
}

function completeStorylet(): Record<string, unknown> {
  return yaml.load(readFileSync(path.resolve(process.cwd(), "tests", "fixtures", "story-storylet-complete.yaml"), "utf8"), {
    schema: yaml.JSON_SCHEMA
  }) as Record<string, unknown>;
}

function storyletRecord(parsed: Record<string, unknown>) {
  return record("storylet_record", "SLT-0001", "stories/alpha/_source/storylets/SLT-0001.yaml", parsed);
}

function pageRecord(id: string, appliedVariant: string | null, eventIds: string[]) {
  return record("page_record", id, `stories/alpha/_source/pages/${id}.yaml`, {
    id,
    story_id: "STORY-001",
    storylet_realized: "SLT-0001",
    applied_event_ops: eventIds,
    state_snapshot: {
      applied_effect_variant: appliedVariant
    }
  });
}

function eventRecord(id: string, opTypes: string[]) {
  return record("story_event_record", id, `stories/alpha/_source/events/${id}.yaml`, {
    id,
    story_id: "STORY-001",
    event_kind: "selected_choice",
    ops: opTypes.map((opType, index) => ({
      op_id: `OP-${String(index + 1).padStart(4, "0")}`,
      op_type: opType,
      input_records: [],
      output_records: [],
      deterministic_payload: {}
    }))
  });
}
