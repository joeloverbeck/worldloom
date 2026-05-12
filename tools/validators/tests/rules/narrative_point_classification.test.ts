import assert from "node:assert/strict";
import test from "node:test";

import { narrativePointClassification } from "../../src/rules/narrative_point_classification.js";
import { context, record } from "../structural/helpers.js";

test("narrative_point_classification accepts classification consistent with stop category", async () => {
  const result = await narrativePointClassification.run({}, context([
    pageRecord("PG-0002", "NATURAL_COMMITMENT_HINGE", "rendered", "ARCTRACE-0001"),
    traceRecord("ARCTRACE-0001", "PG-0002", "normal_exit")
  ]));

  assert.deepEqual(result, []);
});

test("narrative_point_classification rejects unknown enum values", async () => {
  const result = await narrativePointClassification.run({}, context([
    pageRecord("PG-0002", "MAYBE_HINGE", "rendered", "ARCTRACE-0001")
  ]));

  assert.ok(result.some((verdict) => verdict.code === "narrative_point_classification.unknown_classification"));
});

test("narrative_point_classification rejects inconsistent stop category", async () => {
  const result = await narrativePointClassification.run({}, context([
    pageRecord("PG-0002", "NATURAL_COMMITMENT_HINGE", "rendered", "ARCTRACE-0001"),
    traceRecord("ARCTRACE-0001", "PG-0002", "interrupt_before")
  ]));

  assert.ok(result.some((verdict) => verdict.code === "narrative_point_classification.inconsistent_stop_category"));
});

test("narrative_point_classification accepts PG-0001 root-page default", async () => {
  const result = await narrativePointClassification.run({}, context([
    pageRecord("PG-0001", "NATURAL_COMMITMENT_HINGE", "pending", null)
  ]));

  assert.deepEqual(result, []);
});

test("narrative_point_classification skips missing ARC_TRACE for pending-prose pages", async () => {
  const result = await narrativePointClassification.run({}, context([
    pageRecord("PG-0002", "NATURAL_COMMITMENT_HINGE", "pending", null)
  ]));

  assert.deepEqual(result, []);
});

test("narrative_point_classification rejects rendered pages without required ARC_TRACE", async () => {
  const result = await narrativePointClassification.run({}, context([
    pageRecord("PG-0002", "NATURAL_COMMITMENT_HINGE", "rendered", null)
  ]));

  assert.ok(result.some((verdict) => verdict.code === "narrative_point_classification.missing_arc_trace"));
});

test("narrative_point_classification accepts rendered pages with matching trace by page", async () => {
  const result = await narrativePointClassification.run({}, context([
    pageRecord("PG-0002", "NATURAL_COMMITMENT_HINGE", "rendered", null),
    traceRecord("ARCTRACE-0001", "PG-0002", "normal_exit")
  ]));

  assert.deepEqual(result, []);
});

test("narrative_point_classification preserves rendered trace category mismatch checks", async () => {
  const result = await narrativePointClassification.run({}, context([
    pageRecord("PG-0002", "NATURAL_COMMITMENT_HINGE", "rendered", null),
    traceRecord("ARCTRACE-0001", "PG-0002", "interrupt_before")
  ]));

  assert.ok(result.some((verdict) => verdict.code === "narrative_point_classification.inconsistent_stop_category"));
});

function pageRecord(id: string, classification: string, proseStatus: string, traceId: string | null) {
  return record("page_record", `alpha:${id}`, `stories/alpha/_source/pages/${id}.yaml`, {
    id,
    story_id: "STORY-001",
    prose_status: proseStatus,
    state_snapshot: {
      narrative_point_classification: classification,
      arc_trace_id: traceId
    }
  });
}

function traceRecord(id: string, pageId: string, category: string) {
  return record("arc_trace_record", `alpha:${id}`, `stories/alpha/_source/arc-traces/${id}.yaml`, {
    id,
    story_id: "STORY-001",
    created_at_page: pageId,
    stop_condition_hit: {
      id: "help-accepted",
      category,
      evidence_span: { start: 0, end: 4 }
    }
  });
}
