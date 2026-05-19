import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  MIDSTORY_TRIGGERS_BY_CLASS,
  NON_PROPAGATION_REASONS,
  PLAN_RELATIONS,
  type MidstoryIntroductionClass
} from "../../src/structural/midstory-introduction-utils.js";

interface JsonSchema {
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  oneOf?: JsonSchema[];
  enum?: string[];
  const?: string;
}

test("SPEC-48 structured SE schema enums match validator utility vocabularies", () => {
  const schema = readStoryEventSchema();
  const recordIntroduction = schema.properties?.record_introductions?.items;
  assert.ok(recordIntroduction?.oneOf, "record_introductions oneOf branches should exist");

  for (const [recordClass, triggers] of Object.entries(MIDSTORY_TRIGGERS_BY_CLASS)) {
    const branch = recordIntroduction.oneOf.find((candidate) =>
      candidate.properties?.class?.const === recordClass
    );
    assert.ok(branch, `${recordClass} schema branch should exist`);
    assertSameSet(branch.properties?.trigger?.enum, triggers, `${recordClass} triggers`);
  }

  const stateRelations = schema.properties?.state_relations?.items;
  assertSameSet(stateRelations?.properties?.relation?.enum, PLAN_RELATIONS, "state_relations.relation");

  const nonPropagationFacts = schema.properties?.non_propagation_facts?.items;
  assertSameSet(
    nonPropagationFacts?.properties?.reason?.enum,
    NON_PROPAGATION_REASONS,
    "non_propagation_facts.reason"
  );
});

function readStoryEventSchema(): JsonSchema {
  const schemaPath = path.resolve(process.cwd(), "src", "schemas", "story-event.schema.json");
  return JSON.parse(readFileSync(schemaPath, "utf8")) as JsonSchema;
}

function assertSameSet(actual: readonly string[] | undefined, expected: readonly string[], label: string): void {
  assert.ok(actual, `${label} enum should exist`);
  assert.deepEqual([...actual].sort(), [...expected].sort(), label);
}

function _assertAllClassesCovered(_class: MidstoryIntroductionClass): void {
  // Compile-time exhaustiveness hook for the imported class union.
}
