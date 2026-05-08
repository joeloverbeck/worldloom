import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";

import { arcEnvelopeConformance } from "../../src/rules/arc_envelope_conformance.js";
import { context, record } from "../structural/helpers.js";

test("arc_envelope_conformance rejects high-severity possible violations", async () => {
  const result = await arcEnvelopeConformance.run({}, context([
    traceRecord([violation("forbidden_actions", "high")]),
    storyletRecord()
  ]));

  assert.ok(result.some((verdict) => (
    verdict.severity === "fail" &&
    verdict.code === "arc_envelope_conformance.high_severity_violation"
  )));
});

test("arc_envelope_conformance surfaces medium severity as warning and low severity as info", async () => {
  const result = await arcEnvelopeConformance.run({}, context([
    traceRecord([
      violation("style_directives", "medium"),
      violation("allowed_tactics", "low")
    ]),
    storyletRecord()
  ]));

  assert.ok(result.some((verdict) => verdict.severity === "warn" && verdict.code === "arc_envelope_conformance.medium_severity_violation"));
  assert.ok(result.some((verdict) => verdict.severity === "info" && verdict.code === "arc_envelope_conformance.low_severity_violation"));
});

test("arc_envelope_conformance accepts traces without possible violations", async () => {
  const result = await arcEnvelopeConformance.run({}, context([
    traceRecord([]),
    storyletRecord()
  ]));

  assert.deepEqual(result, []);
});

test("arc_envelope_conformance auto-passes PG-0001 root special case with no arc selected", async () => {
  const result = await arcEnvelopeConformance.run({}, context([
    record("arc_trace_record", "alpha:ARCTRACE-0001", "stories/alpha/_source/arc-traces/ARCTRACE-0001.yaml", {
      id: "ARCTRACE-0001",
      story_id: "STORY-001",
      created_at_page: "PG-0001",
      possible_violations: [violation("forbidden_actions", "high")]
    })
  ]));

  assert.deepEqual(result, []);
});

function violation(envelopeItem: string, severity: string): Record<string, unknown> {
  return {
    envelope_item: envelopeItem,
    severity,
    evidence_span: { start: 0, end: 4 }
  };
}

function traceRecord(possibleViolations: Record<string, unknown>[]) {
  return record("arc_trace_record", "alpha:ARCTRACE-0001", "stories/alpha/_source/arc-traces/ARCTRACE-0001.yaml", {
    id: "ARCTRACE-0001",
    story_id: "STORY-001",
    created_at_page: "PG-0002",
    arc_realized: "SLT-0001",
    possible_violations: possibleViolations
  });
}

function storyletRecord() {
  return record("storylet_record", "alpha:SLT-0001", "stories/alpha/_source/storylets/SLT-0001.yaml", yaml.load(
    readFileSync(path.resolve(process.cwd(), "tests", "fixtures", "story-storylet-complete.yaml"), "utf8"),
    { schema: yaml.JSON_SCHEMA }
  ) as Record<string, unknown>);
}
