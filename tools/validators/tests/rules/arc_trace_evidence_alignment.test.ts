import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";

import { arcTraceEvidenceAlignment } from "../../src/rules/arc_trace_evidence_alignment.js";
import { context, record } from "../structural/helpers.js";

test("arc_trace_evidence_alignment accepts well-formed trace evidence", async () => {
  const result = await arcTraceEvidenceAlignment.run({}, context(validRecords()));

  assert.deepEqual(result, []);
});

test("arc_trace_evidence_alignment rejects evidence spans outside cited prose", async () => {
  const records = validRecords();
  records[0] = traceRecord({
    ...completeTrace(),
    effect_evidence: [
      {
        effect_ref: 0,
        realized: "true",
        evidence_span: { start: 0, end: 5000 }
      }
    ]
  });

  const result = await arcTraceEvidenceAlignment.run({}, context(records));

  assert.ok(result.some((verdict) => verdict.code === "arc_trace_evidence_alignment.invalid_evidence_span"));
});

test("arc_trace_evidence_alignment validates spans against UTF-8 byte length", async () => {
  const prose = "é".repeat(50);
  const records = validRecords(prose);
  records[0] = traceRecord({
    ...completeTrace(),
    effect_evidence: [
      {
        effect_ref: 0,
        realized: "true",
        evidence_span: { start: 0, end: Buffer.byteLength(prose, "utf8") }
      }
    ]
  });

  const result = await arcTraceEvidenceAlignment.run({}, context(records));

  assert.deepEqual(result, []);
});

test("arc_trace_evidence_alignment rejects spans beyond UTF-8 byte length", async () => {
  const prose = "é".repeat(50);
  const records = validRecords(prose);
  records[0] = traceRecord({
    ...completeTrace(),
    effect_evidence: [
      {
        effect_ref: 0,
        realized: "true",
        evidence_span: { start: 0, end: Buffer.byteLength(prose, "utf8") + 1 }
      }
    ]
  });

  const result = await arcTraceEvidenceAlignment.run({}, context(records));

  assert.ok(result.some((verdict) => verdict.code === "arc_trace_evidence_alignment.invalid_evidence_span"));
});

test("arc_trace_evidence_alignment rejects effect refs outside applied variant required effects", async () => {
  const records = validRecords();
  records[0] = traceRecord({
    ...completeTrace(),
    effect_evidence: [
      {
        effect_ref: 3,
        realized: "true",
        evidence_span: { start: 0, end: 6 }
      }
    ]
  });

  const result = await arcTraceEvidenceAlignment.run({}, context(records));

  assert.ok(result.some((verdict) => verdict.code === "arc_trace_evidence_alignment.effect_ref_out_of_range"));
});

test("arc_trace_evidence_alignment rejects stop conditions not present on the realized arc", async () => {
  const records = validRecords();
  records[0] = traceRecord({
    ...completeTrace(),
    stop_condition_hit: {
      id: "missing-stop",
      category: "normal_exit",
      evidence_span: { start: 31, end: 40 }
    }
  });

  const result = await arcTraceEvidenceAlignment.run({}, context(records));

  assert.ok(result.some((verdict) => verdict.code === "arc_trace_evidence_alignment.unknown_stop_condition"));
});

test("arc_trace_evidence_alignment defers when referenced page has prose_status pending", async () => {
  const records = validRecords();
  records[1] = pageRecordWithStatus(undefined, "pending");

  const result = await arcTraceEvidenceAlignment.run({}, context(records));

  assert.equal(result.length, 1);
  const verdict = result[0]!;
  assert.equal(verdict.code, "arc_trace_evidence_alignment.deferred_prose_pending");
  assert.equal(verdict.severity, "info");
  assert.match(verdict.message, /DEFERRED/);
  assert.match(verdict.message, /prose_status="pending"/);
});

test("arc_trace_evidence_alignment defers when referenced page has prose_status superseded", async () => {
  const records = validRecords();
  records[1] = pageRecordWithStatus(undefined, "superseded");

  const result = await arcTraceEvidenceAlignment.run({}, context(records));

  assert.equal(result.length, 1);
  const verdict = result[0]!;
  assert.equal(verdict.code, "arc_trace_evidence_alignment.deferred_prose_pending");
  assert.equal(verdict.severity, "info");
  assert.match(verdict.message, /prose_status="superseded"/);
});

test("arc_trace_evidence_alignment runs evidence-span validation when prose_status is absent (grandfathered)", async () => {
  const result = await arcTraceEvidenceAlignment.run({}, context(validRecords()));

  assert.deepEqual(result, []);
});

function validRecords(prose?: string) {
  return [
    traceRecord(completeTrace()),
    pageRecord(prose),
    storyletRecord(completeStorylet())
  ];
}

function completeTrace(): Record<string, unknown> {
  return {
    id: "ARCTRACE-0001",
    story_id: "STORY-001",
    created_at_page: "PG-0002",
    arc_realized: "SLT-0001",
    effect_variant_applied: "partial-repair",
    realized_beats: [
      {
        beat_id: "B1",
        function: "offer-help",
        realized: "true",
        evidence_span: { start: 0, end: 13 }
      }
    ],
    observed_actions: [
      {
        actor: "STENT-0001",
        action: "offers help",
        target: "STENT-0002",
        evidence_span: { start: 0, end: 13 }
      }
    ],
    observed_claims: [],
    possible_violations: [],
    stop_condition_hit: {
      id: "help-accepted",
      category: "normal_exit",
      evidence_span: { start: 31, end: 40 }
    },
    effect_evidence: [
      {
        effect_ref: 0,
        realized: "true",
        evidence_span: { start: 31, end: 40 }
      }
    ],
    semantic_critic_verdict: {
      status: "pass",
      reasons: [],
      required_revision_constraints: []
    }
  };
}

function completeStorylet(): Record<string, unknown> {
  return yaml.load(readFileSync(path.resolve(process.cwd(), "tests", "fixtures", "story-storylet-complete.yaml"), "utf8"), {
    schema: yaml.JSON_SCHEMA
  }) as Record<string, unknown>;
}

function traceRecord(parsed: Record<string, unknown>) {
  return record("arc_trace_record", "alpha:ARCTRACE-0001", "stories/alpha/_source/arc-traces/ARCTRACE-0001.yaml", parsed);
}

function pageRecord(prose = "Mara accepts the repair help and smiles.") {
  return record("page_record", "alpha:PG-0002", "stories/alpha/_source/pages/PG-0002.yaml", {
    id: "PG-0002",
    story_id: "STORY-001",
    prose
  });
}

function pageRecordWithStatus(prose: string | undefined, proseStatus: string) {
  return record("page_record", "alpha:PG-0002", "stories/alpha/_source/pages/PG-0002.yaml", {
    id: "PG-0002",
    story_id: "STORY-001",
    prose: prose ?? "Mara accepts the repair help and smiles.",
    prose_status: proseStatus
  });
}

function storyletRecord(parsed: Record<string, unknown>) {
  return record("storylet_record", "alpha:SLT-0001", "stories/alpha/_source/storylets/SLT-0001.yaml", parsed);
}
